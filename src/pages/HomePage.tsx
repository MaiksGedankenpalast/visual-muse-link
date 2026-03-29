import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, Plus, Pencil, Flame } from "lucide-react";

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

interface Challenge {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
  category: string | null;
}

interface DailyCompletion {
  id: string;
  challenge_id: string;
  completed: boolean;
}

/* ── goal → category mapping (for prioritisation) ── */
const GOAL_CATEGORIES: Record<string, string[]> = {
  "Stress reduzieren": ["mindfulness", "bewegung", "atmung"],
  "Dankbarkeit üben": ["dankbarkeit", "journaling"],
  "Persönlich wachsen": ["reflexion", "lernen"],
  "Kreativität entfalten": ["kreativität", "schreiben"],
  "Besser schlafen": ["schlaf", "abendroutine"],
  "Gefühle verarbeiten": ["emotionen", "journaling"],
};

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profileName } = useAuth();

  const [loading, setLoading] = useState(true);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [yesterdayMood, setYesterdayMood] = useState<MoodEntry | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [completions, setCompletions] = useState<DailyCompletion[]>([]);
  const [streak, setStreak] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

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

    const [
      { data: todayMoodData },
      { data: yesterdayMoodData },
      { data: challengesData },
      { data: completionsData },
      { data: moodDates },
      { data: profileData },
    ] = await Promise.all([
      supabase.from("mood_entries").select("happy_sad,calm_anxious,confident_insecure,excited_bored,rested_tired,tags").eq("user_id", user.id).eq("date", todayStr).maybeSingle(),
      supabase.from("mood_entries").select("happy_sad,calm_anxious,confident_insecure,excited_bored,rested_tired,tags").eq("user_id", user.id).eq("date", yesterdayStr).maybeSingle(),
      supabase.from("challenges").select("id,title,icon,description,category").or(`is_preset.eq.true,user_id.eq.${user.id}`).limit(20),
      supabase.from("daily_completions").select("id,challenge_id,completed").eq("user_id", user.id).eq("date", todayStr),
      supabase.from("mood_entries").select("date").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabase.from("profiles").select("onboarding_goals").eq("id", user.id).single(),
    ]);

    setTodayMood(todayMoodData as MoodEntry | null);
    setYesterdayMood(yesterdayMoodData as MoodEntry | null);
    setChallenges((challengesData as Challenge[]) ?? []);
    setCompletions((completionsData as DailyCompletion[]) ?? []);
    setGoals((profileData?.onboarding_goals as string[]) ?? []);

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
          // allow streak even if today not yet entered
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

  /* ── toggle challenge completion ── */
  const toggleChallenge = async (challengeId: string) => {
    if (!user) return;
    const existing = completions.find((c) => c.challenge_id === challengeId);
    if (existing) {
      const newVal = !existing.completed;
      await supabase.from("daily_completions").update({ completed: newVal }).eq("id", existing.id);
      setCompletions((prev) => prev.map((c) => c.id === existing.id ? { ...c, completed: newVal } : c));
    } else {
      const { data } = await supabase.from("daily_completions").insert({ user_id: user.id, challenge_id: challengeId, completed: true, date: today() }).select().single();
      if (data) setCompletions((prev) => [...prev, data as DailyCompletion]);
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

  // prioritise challenges by goals
  const priorityCategories = goals.flatMap((g) => GOAL_CATEGORIES[g] ?? []);
  const sortedChallenges = [...challenges].sort((a, b) => {
    const aMatch = priorityCategories.includes(a.category ?? "");
    const bMatch = priorityCategories.includes(b.category ?? "");
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const vibeActiveChallenges = sortedChallenges.slice(0, 6);
  const completedCount = completions.filter((c) => c.completed).length;
  const totalVibe = vibeActiveChallenges.length;

  const name = profileName || "du";

  return (
    <div
      className="px-4 pt-6 pb-4 space-y-5 onboarding-slide"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {pulling && (
        <div className="flex justify-center -mt-4 mb-2">
          <div className="w-8 h-1 rounded-full bg-muted-foreground animate-pulse" />
        </div>
      )}

      {/* HEADER */}
      <div>
        <p className="text-sm text-muted-foreground">{capitalize(germanDate())}</p>
        <h1 className="text-[28px] font-bold text-foreground mt-1">
          Hallo {name} 👋
        </h1>
      </div>

      {/* ARKIE WAVE SECTION */}
      <div className="relative -mx-4">
        <svg viewBox="0 0 430 120" className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-grad-home" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--mindark-primary-start)" />
              <stop offset="100%" stopColor="var(--mindark-primary-end)" />
            </linearGradient>
          </defs>
          <path d="M0 60 Q107 0 215 50 Q323 100 430 40 L430 120 L0 120Z" fill="url(#wave-grad-home)" opacity="0.5" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-4">
          <div className="arkie-float">
            <Arkie size={100} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center px-8">{arkieStatus}</p>
        </div>
      </div>

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

          {/* CARD 2 — Today's Vibe */}
          <div className="glass-card p-[18px]">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-foreground text-[16px]">Today's Vibe</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  {completedCount}/{totalVibe}
                </span>
                <button onClick={() => navigate("/vibe")}>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {vibeActiveChallenges.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Noch keine Challenges für heute. Arkie empfiehlt, anzufangen 💜
                </p>
                <button onClick={() => navigate("/challenges")}
                  className="mt-2 text-xs px-4 py-1.5 rounded-full"
                  style={{ background: "rgba(180,127,232,0.25)", color: "var(--mindark-accent-start)" }}>
                  Entdecken
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {vibeActiveChallenges.slice(0, 3).map((ch) => {
                  const comp = completions.find((c) => c.challenge_id === ch.id);
                  const done = comp?.completed ?? false;
                  return (
                    <button key={ch.id} onClick={() => toggleChallenge(ch.id)}
                      className="flex items-center gap-3 w-full text-left py-1">
                      <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                        style={{
                          borderColor: done ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.2)",
                          background: done ? "var(--mindark-accent-start)" : "transparent",
                        }}>
                        {done && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {ch.icon} {ch.title}
                      </span>
                    </button>
                  );
                })}
                {vibeActiveChallenges.length > 3 && (
                  <button onClick={() => navigate("/vibe")}
                    className="text-xs text-muted-foreground mt-1">
                    + {vibeActiveChallenges.length - 3} weitere
                  </button>
                )}
              </div>
            )}
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

          {/* CARD 3 — Daily Challenges */}
          <div className="glass-card p-[18px]">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-foreground text-[16px]">Daily Challenges</p>
              <button onClick={() => navigate("/challenges")}
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: "rgba(180,127,232,0.25)", color: "var(--mindark-accent-start)" }}>
                Mehr
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sortedChallenges.slice(0, 4).map((ch, i) => (
                <div key={ch.id}
                  className="rounded-[14px] p-3 text-center"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    opacity: i >= 2 ? 0.6 : 1,
                    filter: i >= 2 ? "blur(0.5px)" : "none",
                  }}>
                  <span className="text-[28px] block mb-1">{ch.icon || "✨"}</span>
                  <p className="font-bold text-foreground text-[13px]">{ch.title}</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-2">{ch.description}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;
