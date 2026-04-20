import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, CircleDashed, CircleSlash, Minus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChallengeStatus,
  daysAgoStr,
  removeUserChallenge,
  setChallengeStatus,
  todayStr,
} from "@/lib/userChallenges";

interface ChallengeDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
}

interface LogDot {
  date: string;
  status: ChallengeStatus | null; // null = before added or no record
}

const STATUS_COLORS: Record<ChallengeStatus, string> = {
  completed: "#22c55e",
  partial: "#f59e0b",
  missed: "rgba(255,255,255,0.18)",
  pending: "rgba(255,255,255,0.08)",
};

const ChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [todayStatus, setTodayStatus] = useState<ChallengeStatus>("pending");
  const [history, setHistory] = useState<LogDot[]>([]);
  const [addedAt, setAddedAt] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [savingStatus, setSavingStatus] = useState<ChallengeStatus | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    const fourteenAgo = daysAgoStr(13);
    const [{ data: chData }, { data: logs }, { data: uc }] = await Promise.all([
      supabase.from("challenges").select("id,title,description,category,icon").eq("id", id).maybeSingle(),
      supabase
        .from("daily_completions")
        .select("date,status")
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

    setChallenge((chData as ChallengeDetail) ?? null);
    setAddedAt((uc?.added_at as string | null) ?? null);
    setIsActive((uc?.is_active as boolean | null) ?? false);

    const byDate = new Map<string, ChallengeStatus>();
    (logs ?? []).forEach((l: any) => byDate.set(l.date, l.status as ChallengeStatus));
    setTodayStatus((byDate.get(todayStr()) as ChallengeStatus) ?? "pending");

    const dots: LogDot[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = daysAgoStr(i);
      const beforeAdd = uc?.added_at && d < (uc.added_at as string).slice(0, 10);
      dots.push({ date: d, status: beforeAdd ? null : byDate.get(d) ?? null });
    }
    setHistory(dots);
    setLoading(false);
  }, [user, id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSetStatus = async (status: ChallengeStatus) => {
    if (!user || !id) return;
    setSavingStatus(status);
    await setChallengeStatus(user.id, id, status);
    setTodayStatus(status);
    setHistory((prev) => prev.map((d) => (d.date === todayStr() ? { ...d, status } : d)));
    setSavingStatus(null);
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

  const statusLabel: Record<ChallengeStatus, string> = {
    pending: "Noch offen",
    completed: "Abgeschlossen ✅",
    partial: "Teilweise 🔶",
    missed: "Verpasst",
  };

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
          className="rounded-[16px] p-4 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: STATUS_COLORS[todayStatus] }}
          >
            {todayStatus === "completed" && <Check className="w-5 h-5 text-white" />}
            {todayStatus === "partial" && <Minus className="w-5 h-5 text-white" />}
            {todayStatus === "missed" && <CircleSlash className="w-5 h-5 text-foreground/60" />}
            {todayStatus === "pending" && <CircleDashed className="w-5 h-5 text-foreground/60" />}
          </div>
          <p className="text-foreground font-medium">{statusLabel[todayStatus]}</p>
        </div>

        {isActive && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSetStatus("completed")}
              disabled={savingStatus !== null}
              className="rounded-[14px] py-3 text-foreground font-medium text-sm transition-opacity disabled:opacity-50"
              style={{
                background: todayStatus === "completed"
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              }}
            >
              Abschließen
            </button>
            <button
              onClick={() => handleSetStatus("partial")}
              disabled={savingStatus !== null}
              className="rounded-[14px] py-3 text-foreground font-medium text-sm transition-opacity disabled:opacity-50"
              style={{
                background: todayStatus === "partial"
                  ? "rgba(245,158,11,0.35)"
                  : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Teilweise
            </button>
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
