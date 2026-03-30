import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

const WEEKDAYS = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const JournalPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moodDays, setMoodDays] = useState<MoodDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Alle");
  const [search, setSearch] = useState("");
  const [calendarView, setCalendarView] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState(false);
  const [newCatText, setNewCatText] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: entryData }, { data: moodData }] = await Promise.all([
      supabase.from("journal_entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("mood_entries").select("date, tags, happy_sad, calm_anxious, confident_insecure, excited_bored, rested_tired").eq("user_id", user.id),
    ]);
    const e = (entryData ?? []) as JournalEntry[];
    setEntries(e);
    const cats = [...new Set(e.map((x) => x.category))];
    setCategories(cats);
    setMoodDays((moodData ?? []).map((m: any) => ({
      date: m.date,
      tags: m.tags,
      avg: (m.happy_sad + m.calm_anxious + m.confident_insecure + m.excited_bored + m.rested_tired) / 5,
    })));
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
    // filter by month/year
    result = result.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });
    return result;
  }, [entries, filter, search, viewMonth, viewYear]);

  const getMoodForDate = (dateStr: string) => moodDays.find((m) => m.date === dateStr);

  const moodColor = (avg: number | undefined) => {
    if (avg === undefined) return "#9B6FD4";
    if (avg < 40) return "#4ade80";
    if (avg > 60) return "#ef4444";
    return "#9B6FD4";
  };

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

  const entriesForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filtered.filter((e) => e.date === dateStr);
  };

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const addCategory = () => {
    if (newCatText.trim() && !categories.includes(newCatText.trim())) {
      setCategories((prev) => [...prev, newCatText.trim()]);
    }
    setNewCatText("");
    setNewCat(false);
  };

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate("/home")}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <h1 className="font-bold text-foreground text-[22px]">Your Journal</h1>
        <div className="w-6" />
      </div>

      {/* CATEGORY FILTER */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        <button onClick={() => setFilter("Alle")}
          className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors"
          style={{
            background: filter === "Alle" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
            color: filter === "Alle" ? "white" : "rgba(255,255,255,0.5)",
          }}>
          Alle {catCounts.Alle || 0}
        </button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors"
            style={{
              background: filter === c ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)",
              color: filter === c ? "white" : "rgba(255,255,255,0.5)",
            }}>
            {c} {catCounts[c] || 0}
          </button>
        ))}
        {newCat ? (
          <input autoFocus value={newCatText} onChange={(e) => setNewCatText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            onBlur={addCategory}
            placeholder="Kategorie..."
            className="px-3 py-1.5 rounded-full text-[13px] bg-transparent text-foreground outline-none shrink-0"
            style={{ border: "1px dashed rgba(255,255,255,0.3)", width: 120 }} />
        ) : (
          <button onClick={() => setNewCat(true)}
            className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0"
            style={{ border: "1px dashed rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.4)" }}>
            + Neue Kategorie
          </button>
        )}
      </div>

      {/* SEARCH */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen..."
          className="w-full pl-9 pr-9 py-2.5 rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
          style={{ background: "rgba(255,255,255,0.08)" }} />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* CALENDAR TOGGLE */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-foreground text-sm">Kalender</span>
        <button onClick={() => { setCalendarView((v) => !v); setSelectedDay(null); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: calendarView ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)" }}>
          <CalendarDays className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* MONTH NAVIGATION */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-foreground text-[20px]">{MONTHS_DE[viewMonth]} {viewYear}</h2>
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
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[16px]" />)}
        </div>
      ) : calendarView ? (
        /* ═══ CALENDAR VIEW ═══ */
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-[12px] text-muted-foreground">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasEntry = entries.some((e) => e.date === dateStr);
              const isToday = dateStr === todayStr;
              const multiEntries = entries.filter((e) => e.date === dateStr).length > 1;
              return (
                <button key={day} onClick={() => hasEntry && setSelectedDay(day === selectedDay ? null : day)}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center relative text-sm transition-colors"
                  style={{
                    background: hasEntry ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)",
                    border: isToday ? "2px solid #C99EF0" : "none",
                    color: "white",
                    fontWeight: isToday ? 700 : 400,
                  }}>
                  {day}
                  {multiEntries && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-foreground" />}
                </button>
              );
            })}
          </div>
          {/* Selected day entries */}
          {selectedDay && (
            <div className="space-y-2 mt-2">
              {entriesForDay(selectedDay).map((entry) => (
                <button key={entry.id} onClick={() => navigate(`/journal/${entry.id}`)}
                  className="glass-card p-4 w-full text-left flex gap-3">
                  <div className="w-1.5 rounded-full shrink-0" style={{ background: moodColor(getMoodForDate(entry.date)?.avg) }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-[15px] truncate">{entry.title}</p>
                    <p className="text-muted-foreground text-[13px] line-clamp-2 mt-0.5">{entry.content}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ═══ LIST VIEW ═══ */
        filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Noch keine Einträge in diesem Monat.</p>
            <button onClick={() => navigate("/journal/new")} className="mt-3 btn-pill text-sm"
              style={{ height: 44, width: "auto", padding: "0 28px", display: "inline-flex" }}>
              Ersten Eintrag schreiben
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const d = new Date(entry.date);
              const dayName = WEEKDAYS[d.getDay()];
              const dayNum = d.getDate();
              const mood = getMoodForDate(entry.date);
              const tag = dominantTag(entry.date);
              return (
                <button key={entry.id} onClick={() => navigate(`/journal/${entry.id}`)}
                  className="glass-card p-4 w-full text-left flex gap-3">
                  {/* Color bar */}
                  <div className="w-1.5 rounded-full shrink-0 self-stretch" style={{ background: moodColor(mood?.avg) }} />
                  {/* Date */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-10">
                    <span className="text-[11px] text-muted-foreground">{dayName}</span>
                    <span className="font-bold text-foreground text-lg leading-tight">{dayNum}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-[15px] truncate">{entry.title}</p>
                    <p className="text-muted-foreground text-[13px] line-clamp-2 mt-0.5">{entry.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-muted-foreground">• {entry.category}</span>
                    </div>
                  </div>
                  {/* Mood badge */}
                  {tag && (
                    <div className="shrink-0 flex items-start">
                      <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: "rgba(255,255,255,0.08)" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: moodColor(mood?.avg) }} />
                        {tag}
                      </span>
                    </div>
                  )}
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
