import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, Trash2, ChevronDown, Play, Pause, RotateCcw, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import Arkie from "@/components/Arkie";
import {
  ChallengeStatus,
  daysAgoStr,
  removeUserChallenge,
  todayStr,
} from "@/lib/userChallenges";

interface ChallengeDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  default_target: number | null;
  unit: string | null;
  is_quantifiable: boolean;
}

interface LogDot {
  date: string;
  status: ChallengeStatus | null;
}

type TemplateKind = "A" | "B" | "C";

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  pending: "⬜ Noch offen",
  completed: "✅ Abgeschlossen",
  partial: "🔶 Teilweise",
  missed: "❌ Verpasst",
};

const PURPLE = "#8B5CF6";

/** Map a challenge category to one of the three UI templates. */
function pickTemplate(category: string | null | undefined): TemplateKind {
  const c = (category ?? "").toLowerCase();
  if (["dankbarkeit", "reflexion", "kreativität", "kreativitaet"].some((k) => c.includes(k))) return "A";
  if (["mindfulness", "bewegung", "sport", "achtsamkeit"].some((k) => c.includes(k))) return "B";
  return "C";
}

function formatShortDe(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

const ChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [todayStatus, setTodayStatus] = useState<ChallengeStatus>("pending");
  const [history, setHistory] = useState<LogDot[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  // Template A — three text inputs
  const [responseInputs, setResponseInputs] = useState<string[]>(["", "", ""]);

  // Template B — countdown timer
  const DEFAULT_DURATION = 180; // 3 min
  const [timerRemaining, setTimerRemaining] = useState<number>(DEFAULT_DURATION);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Confirmation flash for Template C
  const [confirmFlash, setConfirmFlash] = useState(false);

  const template = pickTemplate(challenge?.category);

  const fetchAll = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    const fourteenAgo = daysAgoStr(13);
    const [{ data: chData }, { data: logs }, { data: uc }] = await Promise.all([
      supabase
        .from("challenges")
        .select("id,title,description,category,icon,default_target,unit,is_quantifiable")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("daily_completions")
        .select("date,status,logged_value,notes,response_data")
        .eq("user_id", user.id)
        .eq("challenge_id", id)
        .gte("date", fourteenAgo)
        .order("date", { ascending: false }),
      supabase
        .from("user_challenges")
        .select("added_at,is_active")
        .eq("user_id", user.id)
        .eq("challenge_id", id)
        .maybeSingle(),
    ]);

    const ch = (chData as ChallengeDetail) ?? null;
    setChallenge(ch);
    setIsActive((uc?.is_active as boolean | null) ?? false);

    const byDate = new Map<string, { status: ChallengeStatus; notes: string | null; response_data: any }>();
    (logs ?? []).forEach((l: any) =>
      byDate.set(l.date, {
        status: l.status as ChallengeStatus,
        notes: l.notes,
        response_data: l.response_data,
      }),
    );
    const todayLog = byDate.get(todayStr());
    setTodayStatus(todayLog?.status ?? "pending");
    setNote(todayLog?.notes ?? "");
    if (todayLog?.notes) setNoteOpen(true);

    if (todayLog?.response_data && Array.isArray(todayLog.response_data)) {
      const arr = todayLog.response_data as string[];
      setResponseInputs([arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""]);
    } else {
      setResponseInputs(["", "", ""]);
    }

    const dots: LogDot[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = daysAgoStr(i);
      const beforeAdd = uc?.added_at && d < (uc.added_at as string).slice(0, 10);
      dots.push({ date: d, status: beforeAdd ? null : byDate.get(d)?.status ?? null });
    }
    setHistory(dots);
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Timer tick (Template B)
  useEffect(() => {
    if (!timerRunning) return;
    timerRef.current = window.setInterval(() => {
      setTimerRemaining((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Auto-complete Template B when timer hits 0
  useEffect(() => {
    if (template === "B" && timerRemaining === 0 && todayStatus !== "completed" && isActive) {
      void handleQuickComplete(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRemaining]);

  /** Unified save: writes status, notes, and (for A) response_data. */
  const persist = async (opts: {
    status: ChallengeStatus;
    notes?: string | null;
    responseData?: string[] | null;
  }) => {
    if (!user || !id) return;
    await supabase.from("daily_completions").upsert(
      {
        user_id: user.id,
        challenge_id: id,
        date: todayStr(),
        status: opts.status,
        completed: opts.status === "completed",
        notes: opts.notes ?? null,
        response_data: opts.responseData ?? null,
      },
      { onConflict: "user_id,challenge_id,date" },
    );
  };

  const handleSaveTemplateA = async () => {
    if (!user || !id) return;
    setSaving(true);
    const filled = responseInputs.filter((s) => s.trim().length > 0).length;
    const status: ChallengeStatus = filled >= 3 ? "completed" : filled > 0 ? "partial" : "missed";
    await persist({ status, notes: note.trim() || null, responseData: responseInputs });
    // Also persist to dedicated challenge_responses table for the insights engine
    await supabase.from("challenge_responses").upsert(
      {
        user_id: user.id,
        challenge_id: id,
        date: todayStr(),
        response_text_1: responseInputs[0] || null,
        response_text_2: responseInputs[1] || null,
        response_text_3: responseInputs[2] || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,challenge_id,date" },
    );
    setTodayStatus(status);
    setHistory((prev) => prev.map((d) => (d.date === todayStr() ? { ...d, status } : d)));
    setSaving(false);
    setConfirmFlash(true);
    window.setTimeout(() => setConfirmFlash(false), 1200);
    toast({ title: "Gespeichert 💜" });
  };

  const handleQuickComplete = async (silent = false) => {
    if (!user || !id) return;
    setSaving(true);
    await persist({ status: "completed", notes: note.trim() || null });
    setTodayStatus("completed");
    setHistory((prev) =>
      prev.map((d) => (d.date === todayStr() ? { ...d, status: "completed" } : d)),
    );
    setSaving(false);
    setConfirmFlash(true);
    window.setTimeout(() => setConfirmFlash(false), 1500);
    if (!silent) toast({ title: "Stark gemacht 💜" });
  };

  const handleRemove = async () => {
    if (!user || !id) return;
    await removeUserChallenge(user.id, id);
    toast({ title: "Challenge entfernt" });
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-32 min-h-screen">
        <Skeleton className="h-6 w-40 mb-6" />
        <Skeleton className="h-32 rounded-[20px] mb-4" />
        <Skeleton className="h-24 rounded-[20px]" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="px-4 pt-6 min-h-screen">
        <button onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <p className="text-muted-foreground text-sm">Challenge nicht gefunden.</p>
      </div>
    );
  }

  const isCompleted = todayStatus === "completed";
  const arkieBubble = isCompleted ? "Das hast du gut gemacht!" : "Ich bin bei dir 💜";

  // Timer derived values
  const mm = String(Math.floor(timerRemaining / 60)).padStart(2, "0");
  const ss = String(timerRemaining % 60).padStart(2, "0");
  const timerProgress = 1 - timerRemaining / DEFAULT_DURATION;
  const r = 70;
  const c = 2 * Math.PI * r;

  return (
    <div className="px-4 pt-6 pb-32 min-h-screen onboarding-slide">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        {isActive && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                aria-label="Challenge entfernen"
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent style={{ background: "#0D0B14", borderColor: "rgba(255,255,255,0.1)" }}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Challenge entfernen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deine bisherige Historie bleibt erhalten. Du kannst die Challenge jederzeit erneut hinzufügen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-foreground">Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground"
                >
                  Entfernen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* TITLE CARD with Arkie avatar + speech bubble */}
      <div className="glass-card p-5 mb-5 relative">
        <div className="flex items-start gap-3">
          <span className="text-[36px] leading-none">{challenge.icon || "✨"}</span>
          <div className="flex-1 min-w-0 pr-[60px]">
            <h1 className="text-foreground font-bold text-[20px]">{challenge.title}</h1>
            {challenge.category && (
              <span
                className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                {challenge.category}
              </span>
            )}
            {challenge.description && (
              <p className="text-muted-foreground text-[13px] mt-3 leading-relaxed">
                {challenge.description}
              </p>
            )}
          </div>
        </div>

        {/* Arkie avatar top-right + speech bubble */}
        <div className="absolute top-3 right-3 flex flex-col items-end">
          <div
            className="text-[10px] px-2 py-1 rounded-[10px] mb-1 max-w-[120px] text-center leading-tight"
            style={{
              background: "rgba(139,92,246,0.18)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(6px)",
            }}
          >
            {arkieBubble}
          </div>
          <div className="arkie-pulse">
            <Arkie size={45} />
          </div>
        </div>
      </div>

      {/* TODAY STATUS LABEL */}
      <div className="mb-3">
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Heute</p>
        <p className="text-foreground text-sm">{STATUS_LABEL[todayStatus]}</p>
      </div>

      {/* TEMPLATE BODY */}
      {isActive && template === "A" && (
        <div className="mb-5">
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                type="text"
                value={responseInputs[i]}
                onChange={(e) =>
                  setResponseInputs((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                }
                placeholder={`Punkt ${i + 1}...`}
                className="w-full text-foreground placeholder:text-muted-foreground text-[15px] outline-none px-3 py-3"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  borderBottom: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
          <p className="text-center text-[12px] mt-3" style={{ color: PURPLE }}>
            Arkie merkt sich das für deinen Wochenbrief! ✍️
          </p>
          <button
            onClick={handleSaveTemplateA}
            disabled={saving}
            className="w-full mt-4 rounded-[14px] py-3 text-foreground font-medium text-sm transition-opacity disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
            }}
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      )}

      {isActive && template === "B" && (
        <div className="mb-5">
          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: 180, height: 180 }}>
              <svg width={180} height={180} viewBox="0 0 180 180">
                <circle cx={90} cy={90} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
                <circle
                  cx={90}
                  cy={90}
                  r={r}
                  stroke={PURPLE}
                  strokeWidth={6}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - timerProgress)}
                  transform="rotate(-90 90 90)"
                  style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 6px rgba(139,92,246,0.5))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-foreground text-[34px] font-bold tabular-nums">{mm}:{ss}</span>
                <span className="text-muted-foreground text-[11px] uppercase tracking-wider mt-1">Atme</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setTimerRunning((r) => !r)}
                className="px-6 py-3 rounded-[14px] flex items-center gap-2 text-foreground font-medium text-sm"
                style={{
                  background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
                }}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {timerRunning ? "Pause" : "Start"}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setTimerRemaining(DEFAULT_DURATION);
                }}
                aria-label="Zurücksetzen"
                className="w-11 h-11 rounded-[12px] flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <RotateCcw className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Placeholder container */}
            <div
              className="w-full mt-5 flex items-center justify-center gap-2 text-muted-foreground text-xs rounded-[14px]"
              style={{
                height: 120,
                border: "1px dashed rgba(139,92,246,0.3)",
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: PURPLE }} />
              Arkie Illustration & Tipps (Platzhalter)
            </div>

            <button
              onClick={() => handleQuickComplete()}
              disabled={saving}
              className="w-full mt-4 rounded-[14px] py-3 text-foreground font-medium text-sm transition-opacity disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Manuell als erledigt markieren
            </button>
          </div>
        </div>
      )}

      {isActive && template === "C" && (
        <div className="mb-5 flex flex-col items-center">
          <button
            onClick={() => handleQuickComplete()}
            disabled={saving || isCompleted}
            className={`w-full rounded-[18px] py-5 text-foreground font-semibold text-base transition-transform ${
              isCompleted ? "opacity-90" : "arkie-pulse"
            }`}
            style={{
              background: isCompleted
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              boxShadow: isCompleted ? "0 0 24px rgba(34,197,94,0.35)" : "0 0 24px rgba(139,92,246,0.35)",
            }}
          >
            {isCompleted ? "✅ Erledigt" : "Erledigt"}
          </button>
          {(confirmFlash || isCompleted) && (
            <div
              className="mt-5 w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: "0 0 30px rgba(34,197,94,0.5)",
                animation: "arkie-pulse 1.2s ease-out",
              }}
            >
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
          )}
        </div>
      )}

      {/* Note section — common to all templates */}
      {isActive && (
        <div className="mb-6">
          <button
            onClick={() => setNoteOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${noteOpen ? "rotate-180" : ""}`} />
            Notiz hinzufügen
          </button>
          {noteOpen && (
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={async () => {
                // Persist note silently (keeps current status)
                await persist({
                  status: todayStatus,
                  notes: note.trim() || null,
                  responseData: template === "A" ? responseInputs : null,
                });
              }}
              placeholder="Wie lief es? (optional)"
              className="w-full mt-2 rounded-[10px] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          )}
        </div>
      )}

      {/* 14-DAY STREAK BAND */}
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Letzte 14 Tage</p>
        <TooltipProvider delayDuration={150}>
          <div className="flex gap-1.5 items-end justify-between" style={{ height: 56 }}>
            {history.map((d) => {
              const isToday = d.date === todayStr();
              let bg = "rgba(255,255,255,0.1)"; // missed/future/none
              let height = "100%";
              let glow = "none";
              let opacity = 1;
              if (d.status === "completed") {
                bg = PURPLE;
                glow = "0 0 8px rgba(139,92,246,0.55)";
              } else if (d.status === "partial") {
                bg = PURPLE;
                opacity = 0.3;
                height = "55%";
              } else if (d.status === "missed") {
                bg = "rgba(255,255,255,0.1)";
                height = "30%";
              } else {
                // null / future — keep faint full bar
                bg = "rgba(255,255,255,0.06)";
                height = "100%";
              }
              const labelStatus =
                d.status === "completed"
                  ? "Abgeschlossen"
                  : d.status === "partial"
                    ? "Teilweise"
                    : d.status === "missed"
                      ? "Verpasst"
                      : "Keine Daten";
              return (
                <Tooltip key={d.date}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex-1 flex items-end justify-center"
                      style={{ height: "100%" }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height,
                          background: bg,
                          opacity,
                          borderRadius: 999,
                          boxShadow: glow,
                          outline: isToday ? "1.5px solid rgba(139,92,246,0.8)" : "none",
                          outlineOffset: 1,
                          transition: "all 0.2s ease",
                        }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="font-medium">{formatShortDe(d.date)}</div>
                    <div className="text-muted-foreground">{labelStatus}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
        <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-3 rounded-full" style={{ background: PURPLE, boxShadow: "0 0 6px rgba(139,92,246,0.5)" }} /> Abgeschlossen
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-3 rounded-full" style={{ background: PURPLE, opacity: 0.3 }} /> Teilweise
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} /> Verpasst
          </span>
        </div>
      </div>

      {!isActive && (
        <div
          className="mt-6 p-4 rounded-[14px] text-center text-sm text-muted-foreground"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          Diese Challenge ist nicht mehr aktiv. Du siehst nur deine Historie.
        </div>
      )}
    </div>
  );
};

export default ChallengeDetailPage;
