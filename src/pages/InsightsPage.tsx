import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import ReviewsPanel from "@/components/ReviewsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { motion, type PanInfo } from "framer-motion";
import { haptic } from "@/lib/haptics";

const WEEKDAYS = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const SLIDER_LABELS = ["Glücklich", "Ruhig", "Selbstsicher", "Aufgeregt", "Ausgeruht"];

interface MoodEntry {
  date: string;
  happy_sad: number; calm_anxious: number; confident_insecure: number;
  excited_bored: number; rested_tired: number; tags: string[] | null;
}

interface JournalSnippet {
  date: string;
  title: string;
  content: string | null;
}

const InsightsPage = () => {
  const { user, profileName } = useAuth();
  const name = profileName || "du";
  const navigate = useNavigate();

  const [mode, setMode] = useState<"week" | "month" | "weekly_review" | "four_weekly_review">("week");
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [journalSnippets, setJournalSnippets] = useState<JournalSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [streakOpen, setStreakOpen] = useState(false);
  const [streakStats, setStreakStats] = useState<{
    wordsThisWeek: number;
    wordsLastWeek: number;
    timeMinutes: number;
    focusMood: { label: string; emoji: string } | null;
  }>({ wordsThisWeek: 0, wordsLastWeek: 0, timeMinutes: 0, focusMood: null });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date();
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date(today); fourteenDaysAgo.setDate(today.getDate() - 14);
    const sevenAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const fourteenAgoStr = fourteenDaysAgo.toISOString().slice(0, 10);
    const [
      { data: moodData },
      { count },
      { data: journalData },
      { data: journal14Data },
    ] = await Promise.all([
      supabase.from("mood_entries").select("*").eq("user_id", user.id).order("date", { ascending: true }),
      supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("journal_entries").select("date, title, content").eq("user_id", user.id).gte("date", sevenAgoStr),
      supabase.from("journal_entries").select("date, content").eq("user_id", user.id).gte("date", fourteenAgoStr),
    ]);
    setMoods((moodData ?? []) as MoodEntry[]);
    setJournalCount(count ?? 0);
    setJournalSnippets((journalData ?? []) as JournalSnippet[]);

    // ── Compute streak-card stats ──
    const countWords = (s: string | null | undefined): number =>
      s ? s.trim().split(/\s+/).filter(Boolean).length : 0;

    const dateInRange = (dateStr: string, fromStr: string, toStr: string) =>
      dateStr >= fromStr && dateStr < toStr;

    const sevenStr = sevenAgoStr;
    // "this week" = [today-7, today+1) so today counts
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

    let wordsThisWeek = 0;
    let wordsLastWeek = 0;
    ((journal14Data ?? []) as any[]).forEach((j) => {
      const w = countWords(j.content);
      if (dateInRange(j.date, sevenStr, tomorrowStr)) wordsThisWeek += w;
      else if (dateInRange(j.date, fourteenAgoStr, sevenStr)) wordsLastWeek += w;
    });
    const timeMinutes = 0;

    // Focus mood: dominant dimension this week (lower slider value = stronger positive end)
    const weekMoodsArr = ((moodData ?? []) as MoodEntry[]).filter((m) => m.date >= sevenStr && m.date < tomorrowStr);
    let focusMood: { label: string; emoji: string } | null = null;
    if (weekMoodsArr.length > 0) {
      const dims: { key: keyof MoodEntry; label: string; emoji: string }[] = [
        { key: "happy_sad", label: "glücklich", emoji: "😊" },
        { key: "calm_anxious", label: "ruhig", emoji: "🧘" },
        { key: "confident_insecure", label: "selbstsicher", emoji: "💪" },
        { key: "excited_bored", label: "aufgeregt", emoji: "⚡" },
        { key: "rested_tired", label: "ausgeruht", emoji: "🌙" },
      ];
      const scored = dims.map((d) => {
        const sum = weekMoodsArr.reduce((a, m) => a + (m[d.key] as number), 0);
        const avg = sum / weekMoodsArr.length;
        return { ...d, strength: 100 - avg }; // higher = more pronounced positive feeling
      });
      scored.sort((a, b) => b.strength - a.strength);
      focusMood = { label: scored[0].label, emoji: scored[0].emoji };
    }

    setStreakStats({ wordsThisWeek, wordsLastWeek, timeMinutes, focusMood });

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const avg = (m: MoodEntry) => (m.happy_sad + m.calm_anxious + m.confident_insecure + m.excited_bored + m.rested_tired) / 5;

  // ── Week data ──
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const weekChartData = useMemo(() => last7Days.map((dateStr) => {
    const m = moods.find((x) => x.date === dateStr);
    const d = new Date(dateStr);
    return {
      label: WEEKDAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1],
      value: m ? Math.round(100 - avg(m)) : null, // invert: higher = better
      date: dateStr,
      isToday: dateStr === todayStr,
    };
  }), [last7Days, moods, todayStr]);

  const weekMoods = useMemo(() => moods.filter((m) => last7Days.includes(m.date)), [moods, last7Days]);

  const bestDay = useMemo(() => {
    if (weekMoods.length === 0) return null;
    return weekMoods.reduce((a, b) => avg(a) < avg(b) ? a : b);
  }, [weekMoods]);

  const worstDay = useMemo(() => {
    if (weekMoods.length === 0) return null;
    return weekMoods.reduce((a, b) => avg(a) > avg(b) ? a : b);
  }, [weekMoods]);

  // ── Streak ──
  const { streak, maxStreak } = useMemo(() => {
    if (moods.length === 0) return { streak: 0, maxStreak: 0 };
    const dates = new Set(moods.map((m) => m.date));
    let s = 0;
    const d = new Date();
    while (dates.has(d.toISOString().slice(0, 10))) {
      s++; d.setDate(d.getDate() - 1);
    }
    // also check if yesterday started streak (today not yet entered)
    if (s === 0) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      while (dates.has(y.toISOString().slice(0, 10))) {
        s++; y.setDate(y.getDate() - 1);
      }
    }
    // max streak
    const sortedDates = [...dates].sort();
    let ms = 0, cs = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      prev.setDate(prev.getDate() + 1);
      if (prev.toISOString().slice(0, 10) === sortedDates[i]) { cs++; }
      else { ms = Math.max(ms, cs); cs = 1; }
    }
    ms = Math.max(ms, cs);
    return { streak: s, maxStreak: ms };
  }, [moods]);

  // ── Week capsule averages ──
  const weekCapsules = useMemo(() => {
    if (weekMoods.length === 0) return null;
    const keys = ["happy_sad", "calm_anxious", "confident_insecure", "excited_bored", "rested_tired"] as const;
    return keys.map((k) => {
      const sum = weekMoods.reduce((a, m) => a + m[k], 0);
      return Math.round(100 - sum / weekMoods.length);
    });
  }, [weekMoods]);

  // ── Pattern insights ──
  const insights = useMemo(() => {
    if (moods.length < 7) return null;
    // Compare avg mood on journaling-days vs non-journaling-days
    const journalDates = new Set(journalSnippets.map((j) => j.date));
    const moodMap = new Map<string, number[]>();
    moods.forEach((m) => {
      const arr = moodMap.get(m.date) ?? [];
      arr.push(avg(m));
      moodMap.set(m.date, arr);
    });
    const dayAvg: { date: string; v: number }[] = [];
    moodMap.forEach((arr, date) => dayAvg.push({ date, v: arr.reduce((a, b) => a + b, 0) / arr.length }));
    const withJ = dayAvg.filter((d) => journalDates.has(d.date)).map((d) => d.v);
    const withoutJ = dayAvg.filter((d) => !journalDates.has(d.date)).map((d) => d.v);
    const results: { text: string }[] = [];
    if (withJ.length >= 2 && withoutJ.length >= 2) {
      const aJ = withJ.reduce((a, b) => a + b, 0) / withJ.length;
      const aN = withoutJ.reduce((a, b) => a + b, 0) / withoutJ.length;
      const diff = Math.round(aN - aJ);
      if (diff > 8) results.push({ text: `An Tagen mit Tagebuch-Eintrag war dein Mood ${diff}% besser 💜` });
    }
    return results.length > 0 ? results : null;
  }, [moods, journalSnippets]);

  // ── Month data ──
  const monthMoods = useMemo(() =>
    moods.filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    }), [moods, viewMonth, viewYear]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}`;
  };

  // ── Keyword extraction per date (Journal > Challenge > Mood-fallback) ──
  const KEYWORD_STOPWORDS = new Set([
    "und","oder","aber","ich","du","er","sie","es","wir","ihr","mir","dir","mich","dich",
    "der","die","das","den","dem","des","ein","eine","einen","einem","eines",
    "ist","war","bin","sind","sein","habe","hat","hatte","haben","werde","wird","wurde",
    "auf","mit","von","zu","im","in","an","aus","bei","nach","vor","über","unter","für","ohne","durch",
    "noch","schon","auch","mal","sehr","heute","gestern","morgen","ja","nein","nicht","kein","keine",
    "wie","wenn","weil","dass","damit","sich","mein","meine","dein","deine",
    "the","and","for","with","this","that","was","you","are","but","not","just","day","today",
  ]);
  const MOOD_FALLBACK = (val: number | null) => {
    if (val === null) return "—";
    if (val >= 75) return "Strahlend";
    if (val >= 60) return "Leicht";
    if (val >= 45) return "Ausgeglichen";
    if (val >= 30) return "Gedämpft";
    return "Schwer";
  };
  const keywordForDate = useCallback((dateStr: string, val: number | null): string => {
    // 1) Journal: extract longest meaningful word from title/content
    const j = journalSnippets.find((x) => x.date === dateStr);
    if (j) {
      const text = `${j.title ?? ""} ${j.content ?? ""}`.toLowerCase();
      const words = text
        .replace(/[^\p{L}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !KEYWORD_STOPWORDS.has(w));
      if (words.length > 0) {
        const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
        return longest.charAt(0).toUpperCase() + longest.slice(1);
      }
    }
    // Mood-derived fallback
    return MOOD_FALLBACK(val);
  }, [journalSnippets]);

  // Custom tooltip renderer for the Area chart
  const MoodTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload as { value: number | null; date: string; label: string };
    if (d.value === null) return null;
    const keyword = keywordForDate(d.date, d.value);
    return (
      <div className="mood-tooltip">
        <div className="mood-tooltip-label">{d.label}</div>
        <div className="mood-tooltip-value">{d.value}%</div>
        <div className="mood-tooltip-keyword">✨ {keyword}</div>
      </div>
    );
  };

  if (loading) return (
    <div className="px-4 pt-6 pb-32 min-h-screen">
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-48 rounded-[20px] mb-4" />
      <Skeleton className="h-24 rounded-[20px] mb-4" />
      <Skeleton className="h-32 rounded-[20px]" />
    </div>
  );

  const handleSwipe = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -110 && Math.abs(info.offset.y) < 80) {
      haptic("selection");
      navigate("/sanctuary");
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      onDragEnd={handleSwipe}
      className="px-4 pt-6 pb-32 onboarding-slide min-h-screen"
    >
      <h1 className="font-bold text-foreground text-[24px] mb-5">Deine Insights</h1>

      {/* MODE TOGGLE */}
      <div className="flex justify-center mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex rounded-full p-1 gap-0.5 shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
          {([
            { k: "week", label: "Woche" },
            { k: "month", label: "Monat" },
            { k: "weekly_review", label: "7-Tage" },
            { k: "four_weekly_review", label: "28-Tage" },
          ] as const).map(({ k, label }) => (
            <button key={k} onClick={() => setMode(k)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                background: mode === k ? "var(--mindark-accent-start)" : "transparent",
                color: mode === k ? "white" : "rgba(255,255,255,0.5)",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "weekly_review" && user && <ReviewsPanel userId={user.id} type="weekly" />}
      {mode === "four_weekly_review" && user && <ReviewsPanel userId={user.id} type="four_weekly" />}

      {mode === "week" && (
        <div className="insights-stagger">
          {/* ═══ WEEK VIEW ═══ */}
          {/* MOOD CHART */}
          <div className="glass-card p-4 mb-4">
            <p className="font-bold text-foreground text-sm mb-3">Mood-Verlauf</p>
            {weekMoods.length === 0 ? (
              <div className="text-center py-8">
                <div className="arkie-float inline-block mb-3"><Arkie size="small" /></div>
                <p className="text-muted-foreground text-sm">Noch keine Daten für diese Woche.</p>
              </div>
            ) : (
              <div className="h-[180px] insights-chart-draw mood-line-glow">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekChartData}>
                    <defs>
                      <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--mindark-accent-start)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--mindark-accent-start)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="moodLineGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#7B5EA7" />
                        <stop offset="60%" stopColor="#B47FE8" />
                        <stop offset="100%" stopColor="#E0BEF5" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
                    <Tooltip
                      content={<MoodTooltip />}
                      cursor={{ stroke: "rgba(180,127,232,0.35)", strokeWidth: 1, strokeDasharray: "3 3" }}
                    />
                    <Area type="monotone" dataKey="value" stroke="url(#moodLineGrad)"
                      strokeWidth={2.5} fill="url(#moodGrad)" connectNulls={false}
                      dot={{ fill: "var(--mindark-accent-start)", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 7, fill: "#fff", stroke: "var(--mindark-accent-end)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* BEST / WORST DAY */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="glass-card p-3 text-center">
              <p className="text-[13px] text-muted-foreground mb-1">🌟 Bester Tag</p>
              {bestDay ? (
                <>
                  <p className="text-foreground font-bold text-sm">{formatDate(bestDay.date)}</p>
                  <p className="text-sm font-bold mood-glow-good" style={{ color: "#4ade80" }}>{Math.round(100 - avg(bestDay))}%</p>
                </>
              ) : <p className="text-muted-foreground text-xs">Noch zu wenig Daten</p>}
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[13px] text-muted-foreground mb-1">🌙 Schwieriger Tag</p>
              {worstDay ? (
                <>
                  <p className="text-foreground font-bold text-sm">{formatDate(worstDay.date)}</p>
                  <p className="text-sm font-bold mood-glow-rough" style={{ color: "#ef4444" }}>{Math.round(100 - avg(worstDay))}%</p>
                </>
              ) : <p className="text-muted-foreground text-xs">Noch zu wenig Daten</p>}
            </div>
          </div>

          {/* STREAK + INTERACTIVE STATS ACCORDION */}
          <div
            className="rounded-[20px] mb-4 gradient-primary overflow-hidden"
            style={{ boxShadow: "0 8px 32px 0 rgba(0,0,0,0.37)" }}
          >
            <button
              onClick={() => setStreakOpen((v) => !v)}
              className="w-full p-5 flex items-center justify-between text-left tap-feedback"
              aria-expanded={streakOpen}
            >
              <div className="flex-1 text-center">
                {streak > 0 ? (
                  <>
                    <p className="text-foreground font-bold text-xl">🔥 {streak} Tage in Folge</p>
                    <p className="text-foreground/60 text-sm mt-1">Dein bisheriger Rekord: {maxStreak} Tage</p>
                  </>
                ) : (
                  <p className="text-foreground text-sm">Starte heute deinen ersten Streak 💜</p>
                )}
              </div>
              <ChevronDown
                className="w-5 h-5 text-foreground/80 shrink-0 ml-2 transition-transform"
                style={{ transform: streakOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: streakOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  className="px-5 pb-5 pt-1 space-y-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {/* Expressionist */}
                  <div className="pt-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-foreground/60 text-[11px] uppercase tracking-wider mb-1">✍️ Der Expressionist</p>
                    <p className="text-foreground text-sm pb-3">
                      Du hast diese Woche{" "}
                      <span className="font-bold">{streakStats.wordsThisWeek}</span> Wörter genutzt, um deine Gedanken zu ordnen.
                    </p>
                  </div>

                  {/* Time for you */}
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-foreground/60 text-[11px] uppercase tracking-wider mb-1">⏳ Zeit für dich</p>
                    <p className="text-foreground text-sm pb-3">
                      In den letzten 7 Tagen hast du dir{" "}
                      <span className="font-bold">{streakStats.timeMinutes}</span> Minuten bewusst Zeit für dich genommen.
                    </p>
                  </div>

                  {/* Focus mood */}
                  <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-foreground/60 text-[11px] uppercase tracking-wider mb-1">💜 Fokus-Emotion</p>
                    <p className="text-foreground text-sm pb-3">
                      {streakStats.focusMood ? (
                        <>
                          Diese Woche fühlst du dich meistens{" "}
                          <span className="font-bold">{streakStats.focusMood.label}</span>{" "}
                          {streakStats.focusMood.emoji}
                        </>
                      ) : (
                        <>Noch keine Mood-Daten für diese Woche.</>
                      )}
                    </p>
                  </div>

                  {/* Arkie motivation */}
                  <div>
                    <p className="text-foreground/60 text-[11px] uppercase tracking-wider mb-1">✨ Arkies Motivation</p>
                    <p className="text-foreground text-sm">
                      {(() => {
                        const a = streakStats.wordsThisWeek;
                        const b = streakStats.wordsLastWeek;
                        if (b > 0 && a > b) {
                          const pct = Math.round(((a - b) / b) * 100);
                          return `Du schreibst ${pct}% mehr als letzte Woche – das tut dir gut! 💜`;
                        }
                        return "Jedes Wort zählt. Arkie ist bereit für deinen nächsten Eintrag! 💜";
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WEEK CAPSULE SUMMARY */}
          {weekCapsules && (
            <div className="glass-card p-4 mb-4">
              <p className="font-bold text-foreground text-sm mb-3">Deine Woche im Überblick</p>
              <div className="flex justify-between gap-1">
                {weekCapsules.map((pct, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="relative w-full rounded-full overflow-hidden"
                      style={{ height: 70, background: "rgba(255,255,255,0.08)", borderRadius: 22 }}>
                      <div className="absolute bottom-0 left-0 right-0 gradient-primary flex items-center justify-center insights-bar-rise"
                        style={{ height: `${pct}%`, borderRadius: "0 0 22px 22px", animationDelay: `${0.5 + i * 0.08}s` }}>
                        <span
                          className={`text-foreground font-bold text-[10px] ${
                            ["mood-glow-happy","mood-glow-calm","mood-glow-conf","mood-glow-excited","mood-glow-rested"][i]
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center">{SLIDER_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ARKIE'S INSIGHTS RADAR */}
          <ArkieInsightsRadar
            moods={moods}
            completions={completions}
            userId={user?.id}
          />

          {/* PATTERN INSIGHTS */}
          <div className="mb-4">
            <p className="font-bold text-foreground text-sm mb-3">Arkie hat etwas bemerkt 🔮</p>
            {moods.length < 7 ? (
              <div className="glass-card p-5 text-center">
                <div className="arkie-float inline-block mb-3"><Arkie size="small" /></div>
                <p className="text-muted-foreground text-sm">
                  Arkie sammelt noch Daten für dich. Komm in ein paar Tagen wieder! 🔮
                </p>
                <div className="w-full h-[6px] rounded-full mt-3" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full gradient-primary transition-all"
                    style={{ width: `${Math.min(100, (moods.length / 7) * 100)}%` }} />
                </div>
                <p className="text-muted-foreground text-xs mt-1">{moods.length}/7 Tage erfasst</p>
              </div>
            ) : insights ? (
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div key={i} className="rounded-[14px] p-4 flex items-start gap-3"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    <div className="shrink-0 mt-0.5"><Arkie size="small" /></div>
                    <p className="text-foreground text-[14px]">{insight.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-4 text-center">
                <p className="text-muted-foreground text-sm">Noch keine Muster erkannt. Mach weiter so! ✨</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "month" && (
        <>
          {/* ═══ MONTH VIEW ═══ */}
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground text-lg">{MONTHS_DE[viewMonth]} {viewYear}</h2>
            <div className="flex gap-2">
              <button onClick={() => { viewMonth === 0 ? (setViewMonth(11), setViewYear((y) => y - 1)) : setViewMonth((m) => m - 1); setSelectedDay(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={() => { viewMonth === 11 ? (setViewMonth(0), setViewYear((y) => y + 1)) : setViewMonth((m) => m + 1); setSelectedDay(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* HEATMAP CALENDAR */}
          <div className="glass-card p-4 mb-4">
            <p className="font-bold text-foreground text-sm mb-3">Mood Heatmap</p>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => <div key={d} className="text-center text-[11px] text-muted-foreground">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const m = monthMoods.find((x) => x.date === dateStr);
                const isToday = dateStr === todayStr;
                let bg = "rgba(255,255,255,0.06)";
                if (m) {
                  const a = avg(m);
                  if (a < 40) bg = "rgba(201,158,240,0.6)"; // good
                  else if (a > 60) bg = "rgba(139,92,246,0.25)"; // difficult
                  else bg = "rgba(139,92,246,0.4)"; // neutral
                }
                return (
                  <button key={day} onClick={() => m && setSelectedDay(day === selectedDay ? null : day)}
                    className="aspect-square rounded-lg flex items-center justify-center text-xs transition-colors"
                    style={{
                      background: bg,
                      border: isToday ? "2px solid white" : "none",
                      color: "white",
                      fontWeight: isToday ? 700 : 400,
                    }}>
                    {day}
                  </button>
                );
              })}
            </div>
            {/* Selected day capsule popup */}
            {selectedDay && (() => {
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
              const m = monthMoods.find((x) => x.date === dateStr);
              if (!m) return null;
              const vals = [m.happy_sad, m.calm_anxious, m.confident_insecure, m.excited_bored, m.rested_tired];
              return (
                <div className="mt-3 p-3 rounded-[14px]" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <p className="text-xs text-muted-foreground mb-2">{selectedDay}. {MONTHS_DE[viewMonth]}</p>
                  <div className="flex justify-between gap-2">
                    {vals.map((val, j) => {
                      const pct = 100 - val;
                      return (
                        <div key={j} className="flex flex-col items-center flex-1">
                          <div className="relative w-full rounded-full overflow-hidden"
                            style={{ height: 50, background: "rgba(255,255,255,0.08)", borderRadius: 14 }}>
                            <div className="absolute bottom-0 left-0 right-0 gradient-primary"
                              style={{ height: `${pct}%`, borderRadius: "0 0 14px 14px" }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1">{SLIDER_LABELS[j]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* CHALLENGE COMPLETION RATE */}
          {monthChallengeRate.length > 0 && (
            <div className="glass-card p-4 mb-4">
              <p className="font-bold text-foreground text-sm mb-3">Deine Challenges diesen Monat</p>
              <div className="space-y-3">
                {monthChallengeRate.map(({ cat, pct }) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{cat}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="w-full h-[6px] rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MONTH STATS */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">📝 {journalCount}</p>
              <p className="text-[11px] text-muted-foreground">Einträge</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">✅ {monthCompletions.length}</p>
              <p className="text-[11px] text-muted-foreground">Challenges</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">🔥 {streak}</p>
              <p className="text-[11px] text-muted-foreground">Streak</p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default InsightsPage;
