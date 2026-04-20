import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, CircleDashed, CircleSlash, Minus, Plus, Trash2, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChallengeStatus,
  daysAgoStr,
  deriveStatus,
  removeUserChallenge,
  setChallengeQuantity,
  setChallengeStatus,
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

const STATUS_COLORS: Record<ChallengeStatus, string> = {
  completed: "#22c55e",
  partial: "#f59e0b",
  missed: "rgba(255,255,255,0.18)",
  pending: "rgba(255,255,255,0.08)",
};

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  pending: "⬜ Noch offen",
  completed: "✅ Abgeschlossen",
  partial: "🔶 Teilweise",
  missed: "❌ Verpasst",
};

const ChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [todayStatus, setTodayStatus] = useState<ChallengeStatus>("pending");
  const [loggedValue, setLoggedValue] = useState<number>(0);
  const [history, setHistory] = useState<LogDot[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

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
        .select("date,status,logged_value,notes")
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

    const byDate = new Map<string, { status: ChallengeStatus; logged_value: number | null; notes: string | null }>();
    (logs ?? []).forEach((l: any) =>
      byDate.set(l.date, { status: l.status as ChallengeStatus, logged_value: l.logged_value, notes: l.notes }),
    );
    const todayLog = byDate.get(todayStr());
    setTodayStatus(todayLog?.status ?? "pending");
    setLoggedValue(Number(todayLog?.logged_value ?? 0));
    setNote(todayLog?.notes ?? "");
    if (todayLog?.notes) setNoteOpen(true);

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

  const target = challenge?.default_target ?? null;
  const unit = challenge?.unit ?? "";

  const handleSaveQuantity = async () => {
    if (!user || !id) return;
    setSaving(true);
    const status = await setChallengeQuantity(user.id, id, loggedValue, target, note.trim() || undefined);
    setTodayStatus(status);
    setHistory((prev) => prev.map((d) => (d.date === todayStr() ? { ...d, status } : d)));
    setSaving(false);
    toast({ title: "Gespeichert 💜" });
  };

  const handleBinaryStatus = async (status: ChallengeStatus) => {
    if (!user || !id) return;
    setSaving(true);
    await setChallengeStatus(user.id, id, status, note.trim() || undefined);
    setTodayStatus(status);
    setHistory((prev) => prev.map((d) => (d.date === todayStr() ? { ...d, status } : d)));
    setSaving(false);
    toast({ title: "Status aktualisiert 💜" });
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

  const warnTooHigh =
    challenge.is_quantifiable && target !== null && target > 0 && loggedValue > target * 3;

  // Preview status as user edits (before save)
  const previewStatus: ChallengeStatus = challenge.is_quantifiable
    ? deriveStatus(loggedValue, target)
    : todayStatus;

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

      {/* TITLE CARD */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-[36px] leading-none">{challenge.icon || "✨"}</span>
          <div className="flex-1 min-w-0">
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
      </div>

      {/* TODAY STATUS */}
      <div className="mb-5">
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Heute</p>
        <div
          className="rounded-[16px] p-4 flex items-center gap-3 mb-3"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: STATUS_COLORS[previewStatus] }}
          >
            {previewStatus === "completed" && <Check className="w-5 h-5 text-white" />}
            {previewStatus === "partial" && <Minus className="w-5 h-5 text-white" />}
            {previewStatus === "missed" && <CircleSlash className="w-5 h-5 text-foreground/60" />}
            {previewStatus === "pending" && <CircleDashed className="w-5 h-5 text-foreground/60" />}
          </div>
          <p className="text-foreground font-medium">{STATUS_LABEL[previewStatus]}</p>
        </div>

        {isActive && challenge.is_quantifiable && (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoggedValue((v) => Math.max(0, Number(v) - 1))}
                className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                aria-label="Verringern"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <div
                className="flex-1 flex items-center gap-2 rounded-[12px] px-3 h-11"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={loggedValue}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setLoggedValue(Number.isFinite(n) && n >= 0 ? n : 0);
                  }}
                  className="flex-1 bg-transparent text-foreground text-[16px] font-semibold outline-none"
                />
                {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
              </div>
              <button
                onClick={() => setLoggedValue((v) => Math.max(0, Number(v) + 1))}
                className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                aria-label="Erhöhen"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </button>
            </div>
            {target !== null && (
              <p className="text-muted-foreground text-xs mt-2">
                Ziel: {target}{unit ? ` ${unit}` : ""}
              </p>
            )}
            {warnTooHigh && (
              <p className="text-[12px] mt-2" style={{ color: "#f59e0b" }}>
                Das scheint höher als üblich – bist du sicher?
              </p>
            )}

            <button
              onClick={handleSaveQuantity}
              disabled={saving}
              className="w-full mt-3 rounded-[14px] py-3 text-foreground font-medium text-sm transition-opacity disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              }}
            >
              {saving ? "Speichern..." : "Speichern"}
            </button>
          </>
        )}

        {isActive && !challenge.is_quantifiable && (
          <>
            <button
              onClick={() => handleBinaryStatus("completed")}
              disabled={saving}
              className="w-full rounded-[14px] py-3 text-foreground font-medium text-sm transition-opacity disabled:opacity-50"
              style={{
                background:
                  todayStatus === "completed"
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              }}
            >
              Als erledigt markieren
            </button>
            <button
              onClick={() => handleBinaryStatus("missed")}
              disabled={saving}
              className="w-full mt-2 text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Heute nicht geschafft
            </button>
          </>
        )}

        {/* Collapsible note */}
        {isActive && (
          <div className="mt-3">
            <button
              onClick={() => setNoteOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${noteOpen ? "rotate-180" : ""}`}
              />
              Notiz hinzufügen
            </button>
            {noteOpen && (
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Wie lief es? (optional)"
                className="w-full mt-2 rounded-[10px] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            )}
          </div>
        )}
      </div>

      {/* 14-DAY HISTORY */}
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Letzte 14 Tage</p>
        <div className="flex gap-1.5 justify-between">
          {history.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.status ?? "—"}`}
              className="flex-1 aspect-square rounded-md"
              style={{
                background: d.status ? STATUS_COLORS[d.status] : "rgba(255,255,255,0.04)",
                border: d.date === todayStr() ? "1.5px solid var(--mindark-accent-start)" : "none",
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLORS.completed }} /> Abgeschlossen</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLORS.partial }} /> Teilweise</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_COLORS.missed }} /> Verpasst</span>
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
