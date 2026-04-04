import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ArkieScene from "@/components/ArkieScene";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, Plus, Pencil, Flame, Send } from "lucide-react";

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

interface VibeItem {
  id: string;
  text: string;
  completed: boolean;
}

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
  const [vibeItems, setVibeItems] = useState<VibeItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickVibeText, setQuickVibeText] = useState("");

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
      { data: vibeData },
      { data: moodDates },
      { data: profileData },
    ] = await Promise.all([
      supabase.from("mood_entries").select("happy_sad,calm_anxious,confident_insecure,excited_bored,rested_tired,tags").eq("user_id", user.id).eq("date", todayStr).maybeSingle(),
      supabase.from("mood_entries").select("happy_sad,calm_anxious,confident_insecure,excited_bored,rested_tired,tags").eq("user_id", user.id).eq("date", yesterdayStr).maybeSingle(),
      supabase.from("challenges").select("id,title,icon,description,category").or(`is_preset.eq.true,user_id.eq.${user.id}`).limit(20),
      supabase.from("daily_completions").select("id,challenge_id,completed").eq("user_id", user.id).eq("date", todayStr),
      supabase.from("vibe_items").select("id,text,completed").eq("user_id", user.id).eq("date", todayStr).order("created_at", { ascending: true }),
      supabase.from("mood_entries").select("date").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabase.from("profiles").select("onboarding_goals").eq("id", user.id).single(),
    ]);

    setTodayMood(todayMoodData as MoodEntry | null);
    setYesterdayMood(yesterdayMoodData as MoodEntry | null);
    setChallenges((challengesData as Challenge[]) ?? []);
    setCompletions((completionsData as DailyCompletion[]) ?? []);
    setVibeItems((vibeData as VibeItem[]) ?? []);
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

  // prioritise challenges by goals
  const priorityCategories = goals.flatMap((g) => GOAL_CATEGORIES[g] ?? []);
  const sortedChallenges = [...challenges].sort((a, b) => {
    const aMatch = priorityCategories.includes(a.category ?? "");
    const bMatch = priorityCategories.includes(b.category ?? "");
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const name = profileName || "du";

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
      <div className="px-4 pt-6">
        <p className="text-sm text-muted-foreground">{capitalize(germanDate())}</p>
        <h1 className="text-[28px] font-bold text-foreground mt-1">
          Hallo {name} 👋
        </h1>
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
    </div>
  );
};

export default HomePage;
