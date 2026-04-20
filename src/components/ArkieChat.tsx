import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import Arkie from "./Arkie";
import { ChatMessage, sendMessageToArkie } from "@/lib/arkieChat";
import { fetchArkieContext, MoodCtx, JournalCtx } from "@/lib/arkieContext";
import { useAuth } from "@/hooks/useAuth";

interface ArkieChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
}

const ArkieChat = ({ open, onOpenChange, userName }: ArkieChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hey${userName ? ` ${userName}` : ""}! Ich bin Arkie 💜 Was beschäftigt dich gerade?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [moods, setMoods] = useState<MoodCtx[]>([]);
  const [journals, setJournals] = useState<JournalCtx[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const refreshContext = async () => {
    if (!user) return { moods: [] as MoodCtx[], journals: [] as JournalCtx[] };
    try {
      const ctx = await fetchArkieContext(user.id);
      setMoods(ctx.moods);
      setJournals(ctx.journals);
      return ctx;
    } catch {
      return { moods, journals };
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      refreshContext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    let assistantContent = "";

    try {
      const ctx = await refreshContext();
      await sendMessageToArkie(
        text,
        messages,
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
        { moods: ctx.moods, journals: ctx.journals }
      );
    } catch (err) {
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
          <div className="flex items-center gap-3">
            <Arkie size={28} />
            <span className="text-foreground font-semibold text-base">
              Rede mit Arkie
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
          {messages.map((msg) => (
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
                className="max-w-[78%] px-4 py-2.5 text-sm leading-relaxed"
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

          {/* Loading indicator */}
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

        {/* Input */}
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
            >
              <Send className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ArkieChat;
