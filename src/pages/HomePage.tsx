import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resetPitchData } from "@/lib/seedPitchData";
import ArkieScene from "@/components/ArkieScene";
import { Skeleton } from "@/components/ui/skeleton";
import AddChallengeSheet from "@/components/AddChallengeSheet";
import SmartChallengeWidget from "@/components/SmartChallengeWidget";
import {
  ChallengeStatus,
  autoLogMissedYesterday,
  ensureUserChallengesSeeded,
  todayStr as todayStrFn,
} from "@/lib/userChallenges";
import { Check, ChevronRight, Plus, Pencil, Flame, Send, RotateCcw, Settings as SettingsIcon, CircleDashed, CircleSlash, Minus, Sparkles } from "lucide-react";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ── helpers ── */
const germanDate = () => {
  const d = new Date();
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
};
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── types ── */
interface MoodEntry {
  happy_sad: number;
  calm_anxious: number;
  confident_insecure: number;
  excited_bored: number;
  rested_tired: number;
  tags: string[] | null;
}

interface ActiveChallenge {
  id: string;          // challenge id
  title: string;
  icon: string | null;
  category: string | null;
  status: ChallengeStatus; // status for TODAY
  is_quantifiable: boolean;
  default_target: number | null;
  unit: string | null;
  logged_value: number | null;
  target_value: number | null;
}

interface VibeItem {
  id: string;
  text: string;
  completed: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const STATUS_COLORS: Record<ChallengeStatus, string> = {
  completed: "#22c55e",
  partial: "#f59e0b",
  missed: "rgba(255,255,255,0.2)",
  pending: "rgba(255,255,255,0.08)",
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profileName } = useAuth();

  const [loading, setLoading] = useState(true);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [yesterdayMood, setYesterdayMood] = useState<MoodEntry | null>(null);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [vibeItems, setVibeItems] = useState<VibeItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickVibeText, setQuickVibeText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [dismissTarget, setDismissTarget] = useState<ActiveChallenge | null>(null);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  /* pull-to-refresh */
  const [pullStart, setPullStart] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setPullStart(e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStart && e.touches[0].clientY - pullStart > 80) setPulling(true);
  };
  const handleTouchEnd = () => {
    if (pulling) {
      setRefreshKey((k) => k + 1);
      setPulling(false);
    }
    setPullStart(null);
  };

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const todayStr = today();
    const yesterdayStr = yesterday();

    // 1. Seed challenges if none + auto-log yesterday misses (run in order)
    await ensureUserChallengesSeeded(user.id);
    await autoLogMissedYesterday(user.id);

    const [
      { data: todayMoodData },
      { data: yesterdayMoodData },
      { data: vibeData },
      { data: moodDates },
      { data: activeUC },
      { data: todayLogs },
    ] = await Promise.all([
      supabase.from("mood_entries").select("happy_sad,calm_anxious,confident_insecure,excited_bored,rested_tired,tags").eq("user_id", user.id).eq("date", todayStr).maybeSingle(),
      supabase.from("mood_entries").select("happy_sad,calm_anxious,confident_insecure,excited_bored,rested_tired,tags").eq("user_id", user.id).eq("date", yesterdayStr).maybeSingle(),
      supabase.from("vibe_items").select("id,text,completed").eq("user_id", user.id).eq("date", todayStr).order("created_at", { ascending: true }),
      supabase.from("mood_entries").select("date").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabase
        .from("user_challenges")
        .select("challenge_id, added_at, challenges!inner(id,title,icon,category,is_quantifiable,default_target,unit)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("added_at", { ascending: true }),
      supabase
        .from("daily_completions")
        .select("challenge_id, status, logged_value, target_value")
        .eq("user_id", user.id)
        .eq("date", todayStr),
    ]);

    setTodayMood(todayMoodData as MoodEntry | null);
    setYesterdayMood(yesterdayMoodData as MoodEntry | null);
    setVibeItems((vibeData as VibeItem[]) ?? []);

    const logByChallenge = new Map<string, { status: ChallengeStatus; logged_value: number | null; target_value: number | null }>();
    (todayLogs ?? []).forEach((l: any) =>
      logByChallenge.set(l.challenge_id, { status: l.status, logged_value: l.logged_value, target_value: l.target_value }),
    );

    const active: ActiveChallenge[] = (activeUC ?? []).map((uc: any) => {
      const log = logByChallenge.get(uc.challenges.id);
      return {
        id: uc.challenges.id,
        title: uc.challenges.title,
        icon: uc.challenges.icon,
        category: uc.challenges.category,
        status: log?.status ?? "pending",
        is_quantifiable: uc.challenges.is_quantifiable ?? true,
        default_target: uc.challenges.default_target ?? null,
        unit: uc.challenges.unit ?? null,
        logged_value: log?.logged_value ?? null,
        target_value: log?.target_value ?? uc.challenges.default_target ?? null,
      };
    });
    setActiveChallenges(active);

    // Streak calculation
    if (moodDates && moodDates.length > 0) {
      const dates = moodDates.map((m: { date: string }) => m.date).sort().reverse();
      let s = 0;
      const d = new Date();
      for (const dateStr of dates) {
        const expected = d.toISOString().slice(0, 10);
        if (dateStr === expected) {
          s++;
          d.setDate(d.getDate() - 1);
        } else if (s === 0 && dateStr === yesterday()) {
          d.setDate(d.getDate() - 1);
          const exp2 = d.toISOString().slice(0, 10);
          if (dateStr === exp2) { s++; d.setDate(d.getDate() - 1); }
        } else {
          break;
        }
      }
      setStreak(s);
    } else {
      setStreak(0);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);

  /* ── quick add vibe ── */
  const addQuickVibe = async () => {
    if (!user || !quickVibeText.trim()) return;
    const text = quickVibeText.trim();
    const optimistic: VibeItem = { id: crypto.randomUUID(), text, completed: false };
    setVibeItems((prev) => [...prev, optimistic]);
    setQuickVibeText("");

    const { data } = await supabase
      .from("vibe_items")
      .insert({ user_id: user.id, text, date: today() })
      .select("id,text,completed")
      .single();
    if (data) {
      setVibeItems((prev) => prev.map((i) => i.id === optimistic.id ? (data as VibeItem) : i));
    }
  };

  /* ── derived state ── */
  const arkieStatus = (() => {
    if (!yesterdayMood) return "Arkie wartet auf deinen ersten Eintrag 🌙";
    const avg = (yesterdayMood.happy_sad + yesterdayMood.calm_anxious + yesterdayMood.confident_insecure + yesterdayMood.excited_bored + yesterdayMood.rested_tired) / 5;
    if (avg < 35) return "Arkie fühlt sich gut heute 💜";
    if (avg <= 65) return "Arkie ist neugierig auf deinen Tag ✨";
    return "Arkie denkt an dich 🌙";
  })();

  const moodDone = !!todayMood;
  const dominantTag = todayMood?.tags?.[0] ?? null;

  // Vibe stats
  const vibeCompleted = vibeItems.filter((v) => v.completed).length;
  const vibeTotal = vibeItems.length;

  const name = profileName || "du";

  const renderStatusIcon = (status: ChallengeStatus) => {
    const common = "w-4 h-4";
    if (status === "completed") return <Check className={`${common} text-white`} />;
    if (status === "partial") return <Minus className={`${common} text-white`} />;
    if (status === "missed") return <CircleSlash className={`${common} text-foreground/60`} />;
    return <CircleDashed className={`${common} text-foreground/50`} />;
  };

  const confirmDismiss = async () => {
    if (!user || !dismissTarget) return;
    const target = dismissTarget;
    setDismissTarget(null);
    // Trigger slide-out animation
    setDismissingIds((prev) => new Set(prev).add(target.id));
    // Background log for Arkie context (best-effort, fire and forget)
    try {
      console.log(`[arkie-context] User dismissed challenge "${target.title}" today`);
    } catch {}
    // After animation, deactivate the user_challenge link (history preserved)
    setTimeout(async () => {
      await supabase
        .from("user_challenges")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("challenge_id", target.id);
      setActiveChallenges((prev) => prev.filter((c) => c.id !== target.id));
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
    }, 280);
  };

  return (
    <div
      className="pb-4 space-y-5 onboarding-slide"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pulling && (
        <div className="flex justify-center -mt-4 mb-2">
          <div className="w-8 h-1 rounded-full bg-muted-foreground animate-pulse" />
        </div>
      )}

      {/* HEADER */}
      <div className="px-4 pt-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{capitalize(germanDate())}</p>
          <h1 className="text-[28px] font-bold text-foreground mt-1">
            Hallo {name} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {user?.email === "pitch@mindark.app" && (
            <button
              onClick={async () => {
                if (!user) return;
                await resetPitchData(user.id);
                await supabase.auth.signOut();
                navigate("/login", { replace: true });
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* ARKIE WAVE SECTION */}
      <div className="-mx-0">
        <ArkieScene arkieSize="large" statusText={arkieStatus} />
      </div>

      <div className="px-4 space-y-5">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-[20px]" />
            <Skeleton className="h-40 rounded-[20px]" />
            <Skeleton className="h-48 rounded-[20px]" />
          </div>
        ) : (
          <>
            {/* CARD 1 — Mood Check-in */}
            <button
              onClick={() => navigate("/moodtracker")}
              className="w-full rounded-[20px] p-[18px] flex items-center justify-between gradient-primary text-left"
            >
              {moodDone ? (
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[16px]">Mood gecheckt ✓</p>
                    {dominantTag && (
                      <span className="inline-block mt-1 text-xs px-3 py-0.5 rounded-full"
                        style={{ background: "rgba(180,127,232,0.3)" }}>
                        {dominantTag}
                      </span>
                    )}
                  </div>
                  <Pencil className="w-4 h-4 text-foreground/60 ml-auto" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-bold text-foreground text-[16px]">Wie geht's dir heute, {name}?</p>
                    <p className="text-xs text-foreground/60 mt-1">Arkie wartet.</p>
                  </div>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.25)" }}>
                    <Plus className="w-6 h-6 text-foreground" />
                  </div>
                </>
              )}
            </button>

            {/* CARD 2 — Today's Vibe (personal to-dos) */}
            <div className="glass-card p-[18px]">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-foreground text-[16px]">Today's Vibe</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                    {vibeCompleted}/{vibeTotal}
                  </span>
                  <button onClick={() => navigate("/vibe")}>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {vibeItems.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-sm text-muted-foreground mb-3">
                    Was steht heute an? 💜
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mb-3">
                  {vibeItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-1">
                      <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                        style={{
                          borderColor: item.completed ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.2)",
                          background: item.completed ? "var(--mindark-accent-start)" : "transparent",
                        }}>
                        {item.completed && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                  {vibeItems.length > 3 && (
                    <button onClick={() => navigate("/vibe")} className="text-xs text-muted-foreground mt-1">
                      + {vibeItems.length - 3} weitere
                    </button>
                  )}
                </div>
              )}

              {/* Quick add */}
              <form onSubmit={(e) => { e.preventDefault(); addQuickVibe(); }} className="flex gap-2">
                <input
                  type="text"
                  value={quickVibeText}
                  onChange={(e) => setQuickVibeText(e.target.value)}
                  placeholder="+ Hinzufügen..."
                  className="flex-1 rounded-[10px] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button type="submit" disabled={!quickVibeText.trim()}
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center gradient-primary disabled:opacity-40 shrink-0">
                  <Send className="w-4 h-4 text-foreground" />
                </button>
              </form>
            </div>

            {/* STREAK */}
            <div className="text-center">
              {streak > 0 ? (
                <p className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-400" /> {streak} Tage in Folge
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Starte deinen ersten Streak heute</p>
              )}
            </div>

            {/* CARD 3 — Daily Challenges (dynamic) */}
            <div className="glass-card p-[18px]">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-foreground text-[16px]">Daily Challenges</p>
                <button onClick={() => navigate("/challenges")}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ background: "rgba(180,127,232,0.25)", color: "var(--mindark-accent-start)" }}>
                  Browse
                </button>
              </div>

              <SmartChallengeWidget />

              {activeChallenges.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Du hast heute noch keine aktiven Challenges.
                  </p>
                  <button
                    onClick={() => setAddOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-foreground"
                    style={{
                      background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Challenge hinzufügen
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {activeChallenges.map((ch) => (
                      <div
                        key={ch.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/challenges/${ch.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/challenges/${ch.id}`);
                          }
                        }}
                        className={`group relative w-full flex items-center gap-3 p-3 pl-9 rounded-[14px] text-left transition-all hover:bg-white/5 cursor-pointer ${
                          dismissingIds.has(ch.id)
                            ? "opacity-0 -translate-x-4 scale-95"
                            : "opacity-100 translate-x-0 scale-100"
                        }`}
                        style={{ background: "rgba(255,255,255,0.05)", transitionDuration: "260ms" }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDismissTarget(ch);
                          }}
                          aria-label="Challenge entfernen"
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-foreground/30 hover:text-foreground/80 hover:bg-white/10 focus:text-foreground/80 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[22px] leading-none shrink-0">{ch.icon || "✨"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-[14px] truncate">{ch.title}</p>
                          {ch.is_quantifiable && ch.status === "partial" && ch.logged_value != null ? (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {ch.logged_value} / {ch.target_value ?? ch.default_target ?? "—"}
                              {ch.unit ? ` ${ch.unit}` : ""}
                            </p>
                          ) : ch.category ? (
                            <span
                              className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                            >
                              {ch.category}
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: STATUS_COLORS[ch.status] }}
                        >
                          {renderStatusIcon(ch.status)}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setAddOpen(true)}
                    className="w-full mt-3 text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    + Challenge hinzufügen
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <AddChallengeSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => setRefreshKey((k) => k + 1)}
      />

      <AlertDialog open={!!dismissTarget} onOpenChange={(open) => !open && setDismissTarget(null)}>
        <AlertDialogContent className="max-w-[340px] rounded-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px]">
              Diese Challenge für heute entfernen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Sie verschwindet aus deiner heutigen Übersicht. Du kannst sie jederzeit wieder hinzufügen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <AlertDialogCancel className="flex-1 mt-0">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDismiss}
              className="flex-1 bg-red-500/80 hover:bg-red-500 text-white border-0"
            >
              Ja, entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HomePage;
