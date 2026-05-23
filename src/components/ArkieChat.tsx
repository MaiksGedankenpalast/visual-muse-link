import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, History, Plus, ArrowLeft, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import Arkie from "./Arkie";
import { ChatMessage, sendMessageToArkie } from "@/lib/arkieChat";
import { fetchArkieContext, MoodCtx, JournalCtx, ReviewsCtx } from "@/lib/arkieContext";
import { buildArkieContext } from "@/lib/arkieRichContext";
import {
  ChatSession,
  StoredMessage,
  createSession,
  listSessions,
  loadSessionMessages,
  saveMessage,
  maybeSetSessionTitle,
  buildCrossSessionMemory,
  buildSessionHistoryPayload,
} from "@/lib/chatSessions";
import { useAuth } from "@/hooks/useAuth";
import { detectSafetyMatch, logSafetyEvent, diagnoseHint } from "@/lib/arkieSafety";
import { awardPoints } from "@/lib/treeProgress";

interface ArkieChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
}

type View = "home" | "list" | "active";

const ArkieChat = ({ open, onOpenChange, userName }: ArkieChatProps) => {
  const { user } = useAuth();
  const [view, setView] = useState<View>("home");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const richContextRef = useRef<string | null>(null);
  const richContextPromiseRef = useRef<Promise<string> | null>(null);

  // Preload rich context as soon as drawer opens, with 3s max wait
  useEffect(() => {
    if (open && user) {
      richContextRef.current = null;
      const p = buildArkieContext(user.id, userName);
      richContextPromiseRef.current = p;
      p.then((s) => { richContextRef.current = s; }).catch(() => { /* ignore */ });
    }
  }, [open, user, userName]);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const list = await listSessions(user.id);
      setSessions(list);
    } catch {
      setSessionsError("Konnte Verlauf nicht laden.");
    } finally {
      setSessionsLoading(false);
    }
  }, [user]);

  // When the drawer opens, always reset to Home view
  useEffect(() => {
    if (open) {
      setView("home");
      setActiveSession(null);
      setMessages([]);
      setInput("");
      fetchSessions();
    }
  }, [open, fetchSessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, view]);

  useEffect(() => {
    if (view === "active") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [view]);

  const greetingMessage = (): ChatMessage => ({
    id: "welcome",
    role: "assistant",
    content: `Hey${userName ? ` ${userName}` : ""}! Ich bin Arkie 💜 Was beschäftigt dich gerade?`,
    timestamp: new Date(),
  });

  const startNewChat = async () => {
    if (!user) return;
    try {
      const session = await createSession(user.id);
      setActiveSession(session);
      setMessages([greetingMessage()]);
      setView("active");
    } catch {
      setSessionsError("Konnte neuen Chat nicht starten.");
    }
  };

  const openExistingSession = async (session: ChatSession) => {
    setActiveSession(session);
    setHistoryLoading(true);
    setView("active");
    try {
      const stored = await loadSessionMessages(session.id);
      const mapped: ChatMessage[] = stored.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(mapped.length ? mapped : [greetingMessage()]);
    } catch {
      setMessages([
        {
          id: "err",
          role: "assistant",
          content: "Konnte den Chatverlauf nicht laden 😔",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !user || !activeSession) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    // Capture state needed BEFORE mutating
    const isFirstUserMessage = !messages.some((m) => m.role === "user");
    const priorMessagesForApi: Array<{ role: "user" | "assistant"; content: string }> =
      messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Persist user message + maybe set title
    try {
      await saveMessage(activeSession.id, user.id, "user", text);
      if (isFirstUserMessage) {
        await maybeSetSessionTitle(activeSession.id, text);
      }
    } catch {
      /* non-fatal: continue conversation */
    }

    // Silent reward (throttled to once per 24h inside awardPoints)
    awardPoints(user.id, 20, "chat");

    // ─── Safety guardrails (client-side pre-check) ───
    const safety = detectSafetyMatch(text);
    if (safety) {
      // Fire-and-forget log; never blocks the UI
      void logSafetyEvent({
        userId: user.id,
        rule: safety.rule,
        userMessage: text,
        sessionId: activeSession.id,
      });
    }

    if (safety?.blockSend && safety.reply) {
      const safeMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: safety.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, safeMsg]);
      setIsLoading(false);
      try {
        await saveMessage(activeSession.id, user.id, "assistant", safety.reply);
      } catch { /* ignore */ }
      return;
    }

    // Fetch context (mood + journals + reviews) and cross-session memory in parallel
    let moods: MoodCtx[] = [];
    let journals: JournalCtx[] = [];
    let reviews: ReviewsCtx = { weekly: null, fourWeekly: null };
    let crossMemory: string | null = null;
    try {
      const [ctx, mem] = await Promise.all([
        fetchArkieContext(user.id),
        isFirstUserMessage ? buildCrossSessionMemory(user.id, activeSession.id) : Promise.resolve(null),
      ]);
      moods = ctx.moods;
      journals = ctx.journals;
      reviews = ctx.reviews;
      crossMemory = mem;
    } catch {
      /* fall back to empty context */
    }

    // Resolve rich context: wait at most 3s if not ready
    let richSystem: string | null = richContextRef.current;
    if (!richSystem && richContextPromiseRef.current) {
      try {
        richSystem = await Promise.race([
          richContextPromiseRef.current,
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 3000)),
        ]);
        if (richSystem) richContextRef.current = richSystem;
      } catch { /* ignore */ }
    }

    // Token-aware history slice
    const stored: StoredMessage[] = priorMessagesForApi.map((m, i) => ({
      id: String(i),
      session_id: activeSession.id,
      role: m.role,
      content: m.content,
      created_at: new Date().toISOString(),
    }));
    const historyForApi = buildSessionHistoryPayload(stored);

    const assistantId = crypto.randomUUID();
    let assistantContent = "";

    try {
      await sendMessageToArkie(
        text,
        historyForApi,
        userName,
        (chunk) => {
          setIsLoading(false);
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.id === assistantId) {
              return prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              );
            }
            return [
              ...prev,
              { id: assistantId, role: "assistant" as const, content: assistantContent, timestamp: new Date() },
            ];
          });
        },
        { moods, journals, reviews },
        // Combine cross-session memory + diagnosis hint into one optional system message
        ((): { role: "system"; content: string } | null => {
          const parts: string[] = [];
          if (crossMemory) parts.push(crossMemory);
          if (safety?.rule === "REGEL_2_DIAGNOSE") parts.push(diagnoseHint());
          return parts.length ? { role: "system", content: parts.join("\n\n") } : null;
        })(),
        richSystem || null
      );

      // Persist assistant reply
      if (assistantContent) {
        try {
          await saveMessage(activeSession.id, user.id, "assistant", assistantContent);
        } catch { /* ignore persistence errors */ }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Hmm, da ist etwas schiefgelaufen. Versuch es nochmal 💜",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const headerTitle =
    view === "home" ? "Rede mit Arkie" :
    view === "list" ? "Bisherige Gespräche" :
    "Rede mit Arkie";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="border-t-0 h-[85vh] flex flex-col"
        style={{
          background: "var(--mindark-bg)",
          borderColor: "var(--mindark-card-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--mindark-card-border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {view === "list" && (
              <button
                onClick={() => setView(activeSession ? "active" : "home")}
                className="text-muted-foreground p-1 -ml-1"
                aria-label="Zurück"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Arkie size={28} />
            <span className="text-foreground font-semibold text-base truncate">
              {headerTitle}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {view === "active" && (
              <button
                onClick={() => { setView("list"); fetchSessions(); }}
                className="text-muted-foreground p-2"
                aria-label="Verlauf"
              >
                <History className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground p-1"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HOME VIEW */}
        {view === "home" && (
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide">
            <div className="text-center pt-2">
              <Arkie size={64} />
              <h2 className="text-foreground font-semibold text-lg mt-4">
                Willkommen{userName ? `, ${userName}` : ""} 💜
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Starte ein neues Gespräch oder setze ein vergangenes fort.
              </p>
            </div>

            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-foreground font-medium text-sm"
              style={{
                background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              }}
            >
              <Plus className="w-4 h-4" />
              Neues Gespräch
            </button>

            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">
                  Bisherige Gespräche
                </span>
                {sessions.length > 3 && (
                  <button
                    onClick={() => setView("list")}
                    className="text-xs text-muted-foreground"
                  >
                    Alle anzeigen
                  </button>
                )}
              </div>

              {sessionsLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              )}

              {!sessionsLoading && sessionsError && (
                <div
                  className="p-4 rounded-xl text-sm text-foreground flex items-center justify-between"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <span>{sessionsError}</span>
                  <button
                    onClick={fetchSessions}
                    className="text-xs underline text-muted-foreground"
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}

              {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                <div
                  className="p-5 rounded-xl text-sm text-muted-foreground text-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  Noch keine vergangenen Gespräche.<br />Starte dein erstes 💜
                </div>
              )}

              {!sessionsLoading && !sessionsError && sessions.length > 0 && (
                <div className="space-y-2">
                  {sessions.slice(0, 3).map((s) => (
                    <SessionRow key={s.id} session={s} onClick={() => openExistingSession(s)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide">
            {sessionsLoading && (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            )}
            {!sessionsLoading && sessionsError && (
              <div
                className="p-4 rounded-xl text-sm text-foreground flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <span>{sessionsError}</span>
                <button onClick={fetchSessions} className="text-xs underline">
                  Erneut versuchen
                </button>
              </div>
            )}
            {!sessionsLoading && !sessionsError && sessions.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Noch keine Gespräche. Starte dein erstes 💜
              </div>
            )}
            {!sessionsLoading && sessions.map((s) => (
              <SessionRow key={s.id} session={s} onClick={() => openExistingSession(s)} />
            ))}

            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-foreground font-medium text-sm mt-4"
              style={{
                background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              }}
            >
              <Plus className="w-4 h-4" />
              Neues Gespräch
            </button>
          </div>
        )}

        {/* ACTIVE VIEW */}
        {view === "active" && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
              {historyLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-2/3 rounded-2xl" />
                  <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
                  <Skeleton className="h-12 w-3/4 rounded-2xl" />
                </div>
              )}

              {!historyLoading && messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 mb-1">
                      <Arkie size={24} />
                    </div>
                  )}
                  <div
                    className="max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background:
                        msg.role === "user"
                          ? "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))"
                          : "rgba(255,255,255,0.08)",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="shrink-0 mb-1">
                    <Arkie size={24} />
                  </div>
                  <div
                    className="px-4 py-3 flex gap-1.5"
                    style={{
                      borderRadius: "18px 18px 18px 4px",
                      background: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 px-4 pb-6 pt-2" style={{ borderTop: "1px solid var(--mindark-card-border)" }}>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Schreib Arkie..."
                  className="flex-1 px-4 py-3 rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30"
                  style={{
                    background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
                  }}
                  aria-label="Senden"
                >
                  <Send className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <p
                className="text-center mt-2 text-muted-foreground"
                style={{ fontSize: 10, lineHeight: 1.4 }}
              >
                Arkie ersetzt keine professionelle Beratung. Bei Krisen: 📞 0800 111 0 111 (kostenlos, 24/7)
              </p>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

const SessionRow = ({ session, onClick }: { session: ChatSession; onClick: () => void }) => {
  const title = session.title?.trim() || "Unbenanntes Gespräch";
  const relative = formatDistanceToNow(new Date(session.last_message_at), {
    addSuffix: true,
    locale: de,
  });
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors hover:bg-white/5"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-foreground text-sm font-medium truncate">{title}</div>
        <div className="text-muted-foreground text-xs">
          {relative}
          {typeof session.message_count === "number" && session.message_count > 0
            ? ` · ${session.message_count} Nachrichten`
            : ""}
        </div>
      </div>
    </button>
  );
};

export default ArkieChat;
