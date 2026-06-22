import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import ReviewsPanel from "@/components/ReviewsPanel";
import ResilienceCard from "@/components/ResilienceCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line,
} from "recharts";
import { motion, type PanInfo } from "framer-motion";
import { haptic } from "@/lib/haptics";

const WEEKDAYS_DE = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const WEEKDAYS_EN = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WEEKDAYS_SHORT_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_SHORT_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CORE_LABEL_KEYS = ["Stimmung", "Energie", "Entspannung"];

const COLORS = {
  stimmung: "#9B6FD4",
  stimmungFill: "rgba(155,111,212,0.18)",
  energie: "#6366F1",
  energieFill: "rgba(99,102,241,0.18)",
  stress: "#A78BFA",
  stressFill: "rgba(167,139,250,0.14)",
};

interface MoodEntry {
  id: string;
  date: string;
  created_at: string;
  stimmung: number;
  energie: number;
  stress: number;
  neg_erschoepfung: number | null;
  neg_angst: number | null;
  neg_traurigkeit: number | null;
  neg_einsamkeit: number | null;
  tags: string[] | null;
}

const InsightsPage = () => {
  const { user, profileName } = useAuth();
  const name = profileName || "du";
  const navigate = useNavigate();

  const [mode, setMode] = useState<"week" | "month" | "weekly_review" | "four_weekly_review">("week");
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: moodData }, { count }] = await Promise.all([
      supabase
        .from("mood_entries")
        .select("id, date, created_at, stimmung, energie, stress, neg_erschoepfung, neg_angst, neg_traurigkeit, neg_einsamkeit, tags")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setMoods(((moodData ?? []) as unknown) as MoodEntry[]);
    setJournalCount(count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const score = (m: MoodEntry) => (m.stimmung + m.energie + m.stress) / 3;

  // ── Last 7 days ──
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  // average per day per dimension
  const buildDimChartData = useCallback((key: "stimmung" | "energie" | "stress", invert = false) => {
    const map = new Map<string, { sum: number; n: number }>();
    moods.forEach((m) => {
      const e = map.get(m.date) ?? { sum: 0, n: 0 };
      e.sum += m[key]; e.n += 1;
      map.set(m.date, e);
    });
    return last7Days.map((dateStr) => {
      const e = map.get(dateStr);
      const d = new Date(dateStr);
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const raw = e ? Math.round(e.sum / e.n) : null;
      const v = raw === null ? null : invert ? 100 - raw : raw;
      return { label: WEEKDAYS_SHORT[idx], date: dateStr, value: v };
    });
  }, [moods, last7Days]);

  const stimmungData = useMemo(() => buildDimChartData("stimmung"), [buildDimChartData]);
  const energieData = useMemo(() => buildDimChartData("energie"), [buildDimChartData]);
  const stressData = useMemo(() => buildDimChartData("stress", true), [buildDimChartData]);

  const combinedData = useMemo(() => last7Days.map((dateStr, i) => ({
    label: stimmungData[i].label,
    date: dateStr,
    stimmung: stimmungData[i].value,
    energie: energieData[i].value,
    stress: stressData[i].value,
  })), [stimmungData, energieData, stressData, last7Days]);

  const totalDimPoints = useMemo(() => {
    let n = 0;
    stimmungData.forEach((d) => d.value !== null && n++);
    energieData.forEach((d) => d.value !== null && n++);
    stressData.forEach((d) => d.value !== null && n++);
    return n;
  }, [stimmungData, energieData, stressData]);

  const hourData = useMemo(() => {
    if (moods.length < 7) return null;
    const counts = new Array(24).fill(0);
    moods.forEach((m) => {
      const h = new Date(m.created_at).getHours();
      counts[h] += 1;
    });
    return counts.map((c, h) => ({ hour: `${h}`, count: c }));
  }, [moods]);

  const weekMoods = useMemo(() => moods.filter((m) => last7Days.includes(m.date)), [moods, last7Days]);

  const bestDay = useMemo(() => {
    if (weekMoods.length === 0) return null;
    return weekMoods.reduce((a, b) => score(a) > score(b) ? a : b);
  }, [weekMoods]);

  const worstDay = useMemo(() => {
    if (weekMoods.length === 0) return null;
    return weekMoods.reduce((a, b) => score(a) < score(b) ? a : b);
  }, [weekMoods]);

  // ── Streak ──
  const { streak, maxStreak } = useMemo(() => {
    if (moods.length === 0) return { streak: 0, maxStreak: 0 };
    const dates = new Set(moods.map((m) => m.date));
    let s = 0;
    const d = new Date();
    while (dates.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
    if (s === 0) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      while (dates.has(y.toISOString().slice(0, 10))) { s++; y.setDate(y.getDate() - 1); }
    }
    const sortedDates = [...dates].sort();
    let ms = 0, cs = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      prev.setDate(prev.getDate() + 1);
      if (prev.toISOString().slice(0, 10) === sortedDates[i]) cs++;
      else { ms = Math.max(ms, cs); cs = 1; }
    }
    ms = Math.max(ms, cs);
    return { streak: s, maxStreak: ms };
  }, [moods]);

  // ── 3 capsule averages (Stimmung, Energie, Entspannung) ──
  const weekCapsules = useMemo(() => {
    if (weekMoods.length === 0) return null;
    const sum = weekMoods.reduce(
      (acc, m) => ({
        st: acc.st + m.stimmung,
        en: acc.en + m.energie,
        sr: acc.sr + m.stress,
      }),
      { st: 0, en: 0, sr: 0 },
    );
    const n = weekMoods.length;
    return [Math.round(sum.st / n), Math.round(sum.en / n), Math.round(sum.sr / n)];
  }, [weekMoods]);

  // ── Arkie text insights (negative emotions + general) ──
  const arkieInsights = useMemo(() => {
    if (weekMoods.length === 0) return [];
    const insights: string[] = [];
    const avgOf = (key: keyof MoodEntry) => {
      const vals = weekMoods.map((m) => m[key] as number | null).filter((v): v is number => typeof v === "number");
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const er = avgOf("neg_erschoepfung");
    const ax = avgOf("neg_angst");
    const tr = avgOf("neg_traurigkeit");
    const ei = avgOf("neg_einsamkeit");
    if (er !== null && er > 60) insights.push("Diese Woche zeigt Arkie erhöhte Erschöpfungswerte. Gönn dir Pausen. 🌙");
    if (ax !== null && ax > 50) insights.push("Arkie hat bemerkt: Diese Woche war Sorge ein Thema. Das ist okay — du bist nicht allein. 💜");
    if (tr !== null && tr > 50) insights.push("Es gab traurige Momente diese Woche. Sei sanft mit dir. ✨");
    if (ei !== null && ei > 50) insights.push("Einsamkeit war spürbar. Vielleicht heute jemandem schreiben? 💜");
    if (insights.length === 0 && weekMoods.length >= 4) {
      const avg = weekMoods.reduce((a, m) => a + score(m), 0) / weekMoods.length;
      if (avg > 65) insights.push(`Schöne Woche, ${name}. Deine Stimmung ist insgesamt stark. ✨`);
      else if (avg < 40) insights.push(`Diese Woche war schwer, ${name}. Arkie ist bei dir. 💜`);
    }
    return insights;
  }, [weekMoods, name]);

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

  if (loading) return (
    <div className="px-4 pt-6 pb-32 min-h-screen">
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-32 rounded-[20px] mb-4" />
      <Skeleton className="h-48 rounded-[20px] mb-4" />
      <Skeleton className="h-48 rounded-[20px]" />
    </div>
  );

  const handleSwipe = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -110 && Math.abs(info.offset.y) < 80) {
      haptic("selection");
      navigate("/sanctuary");
    }
  };

  // ── Single dim area chart ──
  const DimChart = ({ data, color, fill, label }: {
    data: { label: string; date: string; value: number | null }[];
    color: string;
    fill: string;
    label: string;
  }) => {
    const hasData = data.some((d) => d.value !== null);
    const gradId = `grad-${label}`;
    return (
      <div className="glass-card p-4 mb-3">
        <p className="font-bold text-foreground text-[14px] mb-3">{label}</p>
        {!hasData ? (
          <div className="text-center py-6">
            <div className="arkie-float inline-block mb-2"><Arkie size="small" /></div>
            <p className="text-muted-foreground text-[13px]">Noch keine Daten für diese Woche.</p>
          </div>
        ) : (
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.55} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={({ x, y, payload, index }) => {
                    const v = data[index]?.value;
                    if (v === null) {
                      return (
                        <g>
                          <text x={x} y={y + 10} fill="rgba(255,255,255,0.35)" fontSize={11} textAnchor="middle">{payload.value}</text>
                          <text x={x} y={y + 22} fill="rgba(255,255,255,0.25)" fontSize={10} textAnchor="middle">–</text>
                        </g>
                      );
                    }
                    return <text x={x} y={y + 14} fill="rgba(255,255,255,0.5)" fontSize={11} textAnchor="middle">{payload.value}</text>;
                  }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,15,35,0.95)",
                    border: "1px solid rgba(167,139,250,0.4)",
                    borderRadius: 8,
                    color: "white",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  formatter={(v: number | string) => [`${v}`, label]}
                  labelFormatter={(_l, payload) => {
                    const p = payload?.[0]?.payload as { date?: string } | undefined;
                    if (!p?.date) return "";
                    return new Date(p.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2.5}
                  fill={`url(#${gradId})`}
                  connectNulls={true}
                  strokeDasharray="0"
                  dot={{ fill: color, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#fff", stroke: color, strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
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
          {/* STREAK CARD — compact */}
          <button
            onClick={() => navigate("/insights/streak-detail")}
            className="w-full rounded-[20px] mb-4 p-4 text-left tap-feedback gradient-primary transition-transform active:scale-[0.98]"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                {streak > 0 ? (
                  <>
                    <p className="text-foreground font-bold text-[18px]">🔥 {streak} Tage in Folge</p>
                    <p className="text-foreground/60 text-[12px] mt-0.5">Rekord: {maxStreak} Tage</p>
                  </>
                ) : (
                  <p className="text-foreground text-[14px]">Starte heute deinen ersten Streak 💜</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-foreground/70 text-[12px]">
                Mehr Details <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>

          {/* BEST / WORST DAY */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="glass-card p-3 text-center">
              <p className="text-[13px] text-muted-foreground mb-1">🌟 Bester Tag</p>
              {bestDay ? (
                <>
                  <p className="text-foreground font-bold text-sm">
                    {new Date(bestDay.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" })}
                  </p>
                  <p className="text-sm font-bold" style={{ color: "#4ade80" }}>{Math.round(score(bestDay))}%</p>
                </>
              ) : <p className="text-muted-foreground text-xs">Noch zu wenig Daten</p>}
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-[13px] text-muted-foreground mb-1">🌙 Schwieriger Tag</p>
              {worstDay ? (
                <>
                  <p className="text-foreground font-bold text-sm">
                    {new Date(worstDay.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" })}
                  </p>
                  <p className="text-sm font-bold" style={{ color: "#ef4444" }}>{Math.round(score(worstDay))}%</p>
                </>
              ) : <p className="text-muted-foreground text-xs">Noch zu wenig Daten</p>}
            </div>
          </div>

          {/* WEEK CAPSULES */}
          {weekCapsules && (
            <div className="glass-card p-4 mb-4">
              <p className="font-bold text-foreground text-sm mb-3">Deine Woche im Überblick</p>
              <div className="flex justify-around gap-3">
                {weekCapsules.map((pct, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="relative w-full overflow-hidden"
                      style={{ height: 80, background: "rgba(255,255,255,0.08)", borderRadius: 22 }}>
                      <div className="absolute bottom-0 left-0 right-0 gradient-primary flex items-center justify-center insights-bar-rise"
                        style={{ height: `${pct}%`, borderRadius: "0 0 22px 22px", animationDelay: `${0.4 + i * 0.1}s` }}>
                        <span className="text-foreground font-bold text-[11px]">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1.5 text-center">{CORE_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DIMENSION CHARTS */}
          <DimChart data={stimmungData} color={COLORS.stimmung} fill={COLORS.stimmungFill} label="Stimmung" />
          <DimChart data={energieData} color={COLORS.energie} fill={COLORS.energieFill} label="Energie" />
          <DimChart data={stressData} color={COLORS.stress} fill={COLORS.stressFill} label="Stress" />

          {/* COMBINED CHART */}
          {totalDimPoints >= 5 && (
            <div className="glass-card p-4 mb-3">
              <p className="font-bold text-foreground text-[14px] mb-3">Alle auf einen Blick</p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(20,15,35,0.95)",
                        border: "1px solid rgba(167,139,250,0.4)",
                        borderRadius: 8,
                        color: "white",
                      }}
                    />
                    <Line type="monotone" dataKey="stimmung" stroke={COLORS.stimmung} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="energie" stroke={COLORS.energie} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="stress" stroke={COLORS.stress} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-3">
                {[
                  { c: COLORS.stimmung, l: "Stimmung" },
                  { c: COLORS.energie, l: "Energie" },
                  { c: COLORS.stress, l: "Stress" },
                ].map(({ c, l }) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span className="text-[11px] text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HOUR PATTERN */}
          {hourData && (
            <div className="glass-card p-4 mb-4">
              <p className="font-bold text-foreground text-[14px] mb-3">Wann schreibst du?</p>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C084FC" />
                        <stop offset="100%" stopColor="#7B5EA7" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false}
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                      interval={2}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(20,15,35,0.95)",
                        border: "1px solid rgba(167,139,250,0.4)",
                        borderRadius: 8,
                        color: "white",
                      }}
                      formatter={(v: number | string) => [`${v} Einträge`, ""]}
                      labelFormatter={(h) => `${h}:00 Uhr`}
                    />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ARKIE INSIGHTS */}
          <ResilienceCard moods={moods} />

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
                <p className="text-muted-foreground text-xs mt-1">{moods.length}/7 Einträge erfasst</p>
              </div>
            ) : arkieInsights.length > 0 ? (
              <div className="space-y-2">
                {arkieInsights.map((text, i) => (
                  <div key={i} className="rounded-[14px] p-4 flex items-start gap-3"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    <div className="shrink-0 mt-0.5"><Arkie size="small" /></div>
                    <p className="text-foreground text-[14px]">{text}</p>
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
                  const s = score(m);
                  if (s > 60) bg = "rgba(201,158,240,0.6)";
                  else if (s < 40) bg = "rgba(139,92,246,0.25)";
                  else bg = "rgba(139,92,246,0.4)";
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
            {selectedDay && (() => {
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
              const m = monthMoods.find((x) => x.date === dateStr);
              if (!m) return null;
              const vals = [m.stimmung, m.energie, m.stress];
              return (
                <div className="mt-3 p-3 rounded-[14px]" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <p className="text-xs text-muted-foreground mb-2">{selectedDay}. {MONTHS_DE[viewMonth]}</p>
                  <div className="flex justify-around gap-3">
                    {vals.map((val, j) => (
                      <div key={j} className="flex flex-col items-center flex-1">
                        <div className="relative w-full overflow-hidden"
                          style={{ height: 50, background: "rgba(255,255,255,0.08)", borderRadius: 14 }}>
                          <div className="absolute bottom-0 left-0 right-0 gradient-primary"
                            style={{ height: `${val}%`, borderRadius: "0 0 14px 14px" }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">{CORE_LABELS[j]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">📝 {journalCount}</p>
              <p className="text-[11px] text-muted-foreground">Einträge</p>
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