import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Search, CalendarDays, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface JournalEntry {
  id: string;
  title: string;
  content: string | null;
  category: string;
  date: string;
  mood_snapshot: number | null;
  created_at: string;
}

interface MoodDay {
  date: string;
  tags: string[] | null;
  avg: number;
}

interface MomentDay {
  date: string;
}

const WEEKDAYS_DE = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const WEEKDAYS_EN = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const moodColor = (avg: number | undefined) => {
  if (avg === undefined) return "#9B6FD4";
  if (avg < 35) return "#4ade80";
  if (avg < 50) return "#facc15";
  if (avg < 65) return "#fb923c";
  return "#ef4444";
};

const JournalPage = () => {
  const { t, i18n } = useTranslation();
  const isEN = i18n.language === "en";
  const WEEKDAYS = isEN ? WEEKDAYS_EN : WEEKDAYS_DE;
  const MONTHS = isEN ? MONTHS_EN : MONTHS_DE;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moodDays, setMoodDays] = useState<MoodDay[]>([]);
  const [momentDates, setMomentDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Alle");
  const [search, setSearch] = useState("");
  const [calendarView, setCalendarView] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"journal" | "mood">("journal");
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [customCategory, setCustomCategory] = useState<string | null>(null);
  const [newCat, setNewCat] = useState(false);
  const [newCatText, setNewCatText] = useState("");

  const FIXED_CATEGORIES = ["Persönlich", "Arbeit"];

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: entryData }, { data: moodData }, { data: momentData }] = await Promise.all([
      supabase.from("journal_entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("mood_entries").select("date, tags, stimmung, energie, stress").eq("user_id", user.id),
      supabase.from("moments").select("date").eq("user_id", user.id),
    ]);
    const e = (entryData ?? []) as JournalEntry[];
    setEntries(e);
    // Find custom category: anything not in fixed list (only 1 allowed)
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(`journal_custom_cat_${user.id}`)
      : null;
    const fromEntries = e.map((x) => x.category).find((c) => !FIXED_CATEGORIES.includes(c)) ?? null;
    setCustomCategory(stored || fromEntries);
    setMoodDays((moodData ?? []).map((m: any) => ({
      date: m.date,
      tags: m.tags,
      // new schema: higher = better → invert for legacy moodColor helper that expects "lower = better"
      avg: 100 - (m.stimmung + m.energie + m.stress) / 3,
    })));
    setMomentDates(new Set(((momentData ?? []) as MomentDay[]).map((m) => m.date)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { Alle: entries.length };
    entries.forEach((e) => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filter !== "Alle") result = result.filter((e) => e.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || (e.content ?? "").toLowerCase().includes(q));
    }
    result = result.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
    return result;
  }, [entries, filter, search, viewMonth, viewYear]);

  const getMoodForDate = (dateStr: string) => moodDays.find((m) => m.date === dateStr);

  const dominantTag = (dateStr: string) => {
    const mood = getMoodForDate(dateStr);
    return mood?.tags?.[0] ?? null;
  };

  // Calendar helpers
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = new Date().toISOString().slice(0, 10);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const addCategory = () => {
    const t = newCatText.trim();
    if (t && !FIXED_CATEGORIES.includes(t) && !customCategory) {
      setCustomCategory(t);
      if (typeof window !== "undefined" && user) {
        window.localStorage.setItem(`journal_custom_cat_${user.id}`, t);
      }
    }
    setNewCatText("");
    setNewCat(false);
  };

  const handleDayTap = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasEntry = entries.some((e) => e.date === dateStr);
    const hasMoment = momentDates.has(dateStr);
    if (hasEntry || hasMoment) {
      navigate(`/journal/day/${dateStr}`);
    }
  };

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate("/home")} aria-label={t("Zurück")}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.3)" }}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-[22px]">{t("Dein Journal")}</h1>
        <div className="w-10" />
      </div>

      {/* CATEGORY FILTER */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        {(["Alle", "Persönlich", "Arbeit", ...(customCategory ? [customCategory] : [])]).map((c) => {
          const active = filter === c;
          const isArbeit = c === "Arbeit";
          const bgActive = isArbeit ? "rgba(99,102,241,0.4)" : "#5B2D9E";
          const borderActive = isArbeit ? "1px solid rgba(99,102,241,0.5)" : "1px solid transparent";
          return (
            <button key={c} onClick={() => setFilter(c)}
              className="px-4 py-2 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors flex flex-col items-center"
              style={{
                background: active ? bgActive : "rgba(255,255,255,0.1)",
                color: active ? "white" : "rgba(255,255,255,0.5)",
                border: active ? borderActive : "1px solid transparent",
                minWidth: 70,
              }}>
              <span className="font-medium">{t(c)}</span>
              <span className="text-[11px] opacity-70">{catCounts[c] || 0} {t("Entries")}</span>
            </button>
          );
        })}
        {!customCategory && (newCat ? (
          <input autoFocus value={newCatText} onChange={(e) => setNewCatText(e.target.value)}
            aria-label={t("Neue Kategorie")}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            onBlur={addCategory}
            placeholder={t("Kategorie...")}
            className="px-3 py-2 rounded-full text-[13px] bg-transparent text-foreground outline-none shrink-0"
            style={{ border: "1px dashed rgba(255,255,255,0.3)", width: 120 }} />
        ) : (
          <button onClick={() => setNewCat(true)}
            className="px-4 py-2 rounded-full text-[13px] whitespace-nowrap shrink-0 flex flex-col items-center justify-center"
            style={{ border: "1px dashed rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.4)", minWidth: 70 }}>
            <span>+</span>
            <span className="text-[10px]">{t("Neue Kategorie")}</span>
          </button>
        ))}
      </div>

      {/* SEARCH */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          aria-label={t("Journaleinträge durchsuchen")}
          placeholder={t("Suchen...")}
          className="w-full pl-9 pr-9 py-2.5 rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.08)" }} />
        {search && (
          <button onClick={() => setSearch("")} aria-label={t("Suche löschen")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* CALENDAR TOGGLE */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-foreground text-sm">{t("Kalender")}</span>
        <button onClick={() => setCalendarView((v) => !v)} aria-label={t("Kalenderansicht umschalten")}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: calendarView ? "#5B2D9E" : "rgba(255,255,255,0.08)" }}>
          <CalendarDays className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* MONTH NAVIGATION */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-foreground text-[20px]">{MONTHS[viewMonth]} {viewYear}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-[16px]" />)}
        </div>
      ) : calendarView ? (
        /* ═══ CALENDAR VIEW ═══ */
        <div>
          {/* Sub-tabs: Journal Calendar / Mood Calendar */}
          <div className="flex justify-center mb-3">
            <div className="flex rounded-full p-1 gap-0.5" style={{ background: "rgba(255,255,255,0.08)" }}>
              {([
                { k: "journal" as const, label: t("Kalender") },
                { k: "mood" as const, label: t("Mood Kalender") },
              ]).map(({ k, label }) => (
                <button
                  key={k}
                  onClick={() => setCalendarMode(k)}
                  className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap"
                  style={{
                    background: calendarMode === k ? "#5B2D9E" : "transparent",
                    color: calendarMode === k ? "white" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-[11px] text-muted-foreground font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasEntry = entries.some((e) => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const mood = getMoodForDate(dateStr);
              const avg = mood?.avg;

              let bg = "rgba(255,255,255,0.06)";
              let textColor = "rgba(255,255,255,0.4)";
              let fontWeight = 400;
              let border = "2px solid transparent";

              if (calendarMode === "journal") {
                if (hasEntry) {
                  bg = "#5B2D9E";
                  textColor = "white";
                  fontWeight = 600;
                  if (avg !== undefined && avg < 35) bg = "#A855F7";
                  else if (avg !== undefined && avg < 50) bg = "#7C3AED";
                }
              } else {
                // Mood Calendar: color filled by mood avg (lower avg = better mood in our schema)
                if (avg !== undefined) {
                  bg = moodColor(avg);
                  textColor = "white";
                  fontWeight = 600;
                }
              }
              if (isToday) {
                border = "2px solid #C99EF0";
                fontWeight = 700;
                textColor = "white";
              }

              return (
                <button key={day} onClick={() => handleDayTap(day)}
                  className="aspect-square rounded-lg flex items-center justify-center text-sm transition-colors"
                  style={{ background: bg, border, color: textColor, fontWeight }}>
                  <span className="relative w-full h-full flex items-center justify-center">
                    {day}
                    {momentDates.has(dateStr) && (
                      <span
                        className="absolute bottom-0.5 right-0.5 text-[8px] leading-none"
                        aria-label={t("Glücksmoment")}
                        title={t("Glücksmoment")}
                      >
                        📷
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {calendarMode === "mood" && (
            <div className="glass-card p-3 mb-4">
              <p className="text-[12px] text-muted-foreground mb-2">{t("Legende")}</p>
              <div className="flex items-center justify-between gap-2 text-[11px] text-foreground/80">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: "#4ade80" }} />{t("Gut")}</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: "#facc15" }} />{t("Mittel")}</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: "#fb923c" }} />{t("Schwer")}</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />{t("Sehr schwer")}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══ LIST VIEW ═══ */
        filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">{t("Noch keine Einträge in diesem Monat.")}</p>
            <button onClick={() => navigate("/journal/new")} className="mt-3 btn-pill text-sm"
              style={{ height: 44, width: "auto", padding: "0 28px", display: "inline-flex" }}>
              {t("Ersten Eintrag schreiben")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => {
              const d = new Date(entry.date);
              const dayName = WEEKDAYS[d.getDay()];
              const dayNum = d.getDate();
              const mood = getMoodForDate(entry.date);
              const tag = dominantTag(entry.date);
              const barColor = moodColor(mood?.avg);
              return (
                <button key={entry.id} onClick={() => navigate(`/journal/day/${entry.date}`)}
                  className="w-full text-left flex rounded-[16px] overflow-hidden transition-transform active:scale-[0.98]"
                  style={{ background: "rgba(139,92,246,0.12)" }}>
                  {/* Color bar */}
                  <div className="w-1.5 shrink-0 self-stretch" style={{ background: barColor }} />
                  {/* Date column */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-12 py-4 px-1">
                    <span className="text-[11px] text-muted-foreground leading-none">{dayName}</span>
                    <span className="font-bold text-foreground text-xl leading-tight mt-0.5">{dayNum}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 py-3 pr-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-foreground text-[15px] truncate flex-1">{entry.title}</p>
                      {tag && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 mt-0.5"
                          style={{ background: "rgba(255,255,255,0.08)" }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: barColor }} />
                          {t(tag)}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[13px] line-clamp-2 mt-1">{entry.content}</p>
                    <span className="text-[11px] text-muted-foreground mt-1.5 block">• {t(entry.category)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default JournalPage;
