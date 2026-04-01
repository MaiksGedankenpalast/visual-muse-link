import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Check, Flame } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from "@/components/ui/drawer";

const GOALS_DATA = [
  { emoji: "🌊", title: "Stress reduzieren", subtitle: "Den Tag hinter dir lassen" },
  { emoji: "🌱", title: "Dankbarkeit üben", subtitle: "Kleine Momente groß machen" },
  { emoji: "🔮", title: "Persönlich wachsen", subtitle: "Dich selbst besser verstehen" },
  { emoji: "✨", title: "Kreativität entfalten", subtitle: "Gedanken fließen lassen" },
  { emoji: "🌙", title: "Besser schlafen", subtitle: "Den Kopf leeren vor dem Schlaf" },
  { emoji: "💜", title: "Gefühle verarbeiten", subtitle: "Raum für alles was du fühlst" },
];

const GOAL_CATEGORIES: Record<string, string[]> = {
  "Stress reduzieren": ["mindfulness", "bewegung", "atmung"],
  "Dankbarkeit üben": ["dankbarkeit", "journaling"],
  "Persönlich wachsen": ["reflexion", "lernen"],
  "Kreativität entfalten": ["kreativität", "schreiben"],
  "Besser schlafen": ["schlaf", "abendroutine"],
  "Gefühle verarbeiten": ["emotionen", "journaling"],
};

const WEEKDAYS_SHORT = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];

const GoalsPage = () => {
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const name = profileName || "du";

  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [weekCompletions, setWeekCompletions] = useState<{ date: string; challenge_id: string; completed: boolean; category: string | null }[]>([]);
  const [weekMoods, setWeekMoods] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  const last7Days = useMemo(() => {
    const days: string[] = [];
    const d = new Date();
    // find last Monday
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const weekStart = last7Days[0];
    const weekEnd = last7Days[6];

    const [{ data: profile }, { data: compData }, { data: moodData }, { data: allMoods }] = await Promise.all([
      supabase.from("profiles").select("onboarding_goals").eq("id", user.id).single(),
      supabase.from("daily_completions").select("date, challenge_id, completed, challenges(category)").eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
      supabase.from("mood_entries").select("date").eq("user_id", user.id).gte("date", weekStart).lte("date", weekEnd),
      supabase.from("mood_entries").select("date").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
    ]);

    setGoals((profile?.onboarding_goals as string[]) ?? []);
    setWeekCompletions((compData ?? []).map((c: any) => ({
      date: c.date, challenge_id: c.challenge_id, completed: c.completed, category: c.challenges?.category ?? null,
    })));
    setWeekMoods((moodData ?? []).map((m: any) => m.date));

    // Streak
    if (allMoods && allMoods.length > 0) {
      const dates = new Set((allMoods as any[]).map((m) => m.date));
      let s = 0;
      const d = new Date();
      while (dates.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
      if (s === 0) { const y = new Date(); y.setDate(y.getDate() - 1); while (dates.has(y.toISOString().slice(0, 10))) { s++; y.setDate(y.getDate() - 1); } }
      setStreak(s);
    }

    setLoading(false);
  }, [user, last7Days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addGoal = async (title: string) => {
    if (!user || goals.includes(title)) return;
    const newGoals = [...goals, title];
    setGoals(newGoals);
    await supabase.from("profiles").update({ onboarding_goals: newGoals }).eq("id", user.id);
    setAddOpen(false);
  };

  const goalProgress = (goalTitle: string) => {
    const cats = GOAL_CATEGORIES[goalTitle] ?? [];
    const relevant = weekCompletions.filter((c) => c.completed && cats.includes(c.category ?? ""));
    const uniqueDays = new Set(relevant.map((c) => c.date));
    return { daysActive: uniqueDays.size, pct: Math.round((uniqueDays.size / 7) * 100) };
  };

  const weekActiveDays = new Set([...weekMoods, ...weekCompletions.filter((c) => c.completed).map((c) => c.date)]).size;

  const totalWeekPct = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + goalProgress(g).pct, 0) / goals.length)
    : 0;

  const motivationMsg = (() => {
    if (streak > 5) return `Du bist auf einem echten Lauf, ${name}. Arkie ist beeindruckt. 🔥`;
    if (totalWeekPct > 80) return `Fast perfekte Woche, ${name}. Arkie ist stolz. 💜`;
    if (weekActiveDays < 2) return `Diese Woche noch ruhig — das ist okay. Morgen ist ein neuer Tag. 🌙`;
    return `Jeder Tag zählt, ${name}. Auch der heutige. ✨`;
  })();

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      <h1 className="font-bold text-foreground text-[24px] mb-5">Deine Ziele</h1>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-16 rounded-[20px]" />
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <div className="arkie-float inline-block mb-4"><Arkie size="large" /></div>
          <p className="text-muted-foreground text-sm mb-4">
            Wähle deine ersten Ziele aus, {name}. Arkie hilft dir dabei. 💜
          </p>
          <button onClick={() => setAddOpen(true)} className="btn-pill text-sm"
            style={{ height: 44, width: "auto", padding: "0 28px", display: "inline-flex" }}>
            Ziele wählen
          </button>
        </div>
      ) : (
        <>
          {/* GOAL CARDS */}
          <div className="space-y-3 mb-6">
            {goals.map((goalTitle) => {
              const goalData = GOALS_DATA.find((g) => g.title === goalTitle);
              const { daysActive, pct } = goalProgress(goalTitle);
              const cats = GOAL_CATEGORIES[goalTitle] ?? [];
              const catParam = cats[0] ?? "";
              const circumference = 2 * Math.PI * 22;
              const dashOffset = circumference - (pct / 100) * circumference;

              return (
                <button key={goalTitle} onClick={() => navigate(`/challenges?kategorie=${catParam}`)}
                  className="w-full glass-card p-[18px] flex items-center gap-4 text-left active:scale-[0.99] transition-transform">
                  <span className="text-[40px] shrink-0">{goalData?.emoji ?? "🎯"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-[16px]">{goalTitle}</p>
                    <p className="text-muted-foreground text-[13px]">{goalData?.subtitle ?? ""}</p>
                    <p className="text-muted-foreground text-[12px] mt-1">
                      <Flame className="w-3 h-3 inline mr-1 text-orange-400" />
                      {daysActive} Tage diese Woche aktiv
                    </p>
                  </div>
                  {/* Progress Ring */}
                  <div className="shrink-0 relative w-14 h-14">
                    <svg viewBox="0 0 48 48" className="w-14 h-14 -rotate-90">
                      <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle cx="24" cy="24" r="22" fill="none"
                        stroke="url(#goalGrad)" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        className="transition-all duration-700" />
                      <defs>
                        <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="var(--mindark-accent-start)" />
                          <stop offset="100%" stopColor="var(--mindark-accent-end)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-foreground font-bold text-[14px]">
                      {pct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ADD GOAL */}
          <button onClick={() => setAddOpen(true)}
            className="w-full rounded-[16px] p-4 mb-6 text-center"
            style={{ border: "2px dashed var(--mindark-accent-start)", background: "transparent" }}>
            <span className="text-sm" style={{ color: "var(--mindark-accent-start)" }}>
              <Plus className="w-4 h-4 inline mr-1" />
              Weiteres Ziel hinzufügen
            </span>
          </button>

          {/* WEEK OVERVIEW */}
          <div className="mb-6">
            <p className="font-bold text-foreground text-sm mb-3">Diese Woche</p>
            <div className="flex justify-between gap-1 mb-2">
              {last7Days.map((dateStr, i) => {
                const hasMood = weekMoods.includes(dateStr);
                const hasChallenge = weekCompletions.some((c) => c.date === dateStr && c.completed);
                const isToday = dateStr === todayStr;
                let bg = "rgba(255,255,255,0.08)";
                if (hasMood && hasChallenge) bg = "var(--mindark-accent-start)";
                else if (hasMood) bg = "rgba(180,127,232,0.5)";

                return (
                  <div key={dateStr} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{WEEKDAYS_SHORT[i]}</span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        background: bg,
                        border: isToday ? "2px solid white" : "none",
                      }}>
                      {hasMood && hasChallenge && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs text-center">
              In {weekActiveDays} von 7 Tagen aktiv gewesen
            </p>
          </div>

          {/* MOTIVATION CARD */}
          <div className="rounded-[20px] p-5 gradient-primary flex items-center gap-4">
            <Arkie size="small" className={streak > 3 ? "arkie-pulse" : ""} />
            <p className="text-foreground text-sm flex-1">{motivationMsg}</p>
          </div>
        </>
      )}

      {/* ADD GOAL DRAWER */}
      <Drawer open={addOpen} onOpenChange={setAddOpen}>
        <DrawerContent style={{ background: "var(--mindark-bg)", borderColor: "var(--mindark-card-border)" }}>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="text-foreground">Ziel hinzufügen</DrawerTitle>
            <DrawerClose asChild>
              <button className="text-muted-foreground">✕</button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {GOALS_DATA.map(({ emoji, title, subtitle }) => {
              const alreadySelected = goals.includes(title);
              return (
                <button key={title} onClick={() => !alreadySelected && addGoal(title)}
                  disabled={alreadySelected}
                  className="w-full glass-card p-4 flex items-center gap-3 text-left transition-opacity"
                  style={{ opacity: alreadySelected ? 0.4 : 1 }}>
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">{title}</p>
                    <p className="text-muted-foreground text-xs">{subtitle}</p>
                  </div>
                  {alreadySelected && <Check className="w-4 h-4 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default GoalsPage;
