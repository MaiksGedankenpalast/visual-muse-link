import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MoodLite {
  date: string;
  stimmung: number;
  energie: number;
  stress: number;
}

const StreakDetailPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    wordsThisWeek: number;
    wordsLastWeek: number;
    timeMinutes: number;
    focusMood: { label: string; emoji: string } | null;
    streak: number;
    maxStreak: number;
  }>({ wordsThisWeek: 0, wordsLastWeek: 0, timeMinutes: 0, focusMood: null, streak: 0, maxStreak: 0 });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date();
    const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 7);
    const fourteenAgo = new Date(today); fourteenAgo.setDate(today.getDate() - 14);
    const sevenStr = sevenAgo.toISOString().slice(0, 10);
    const fourteenStr = fourteenAgo.toISOString().slice(0, 10);
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

    const [{ data: journal14 }, { data: moodAll }] = await Promise.all([
      supabase.from("journal_entries").select("date, content").eq("user_id", user.id).gte("date", fourteenStr),
      supabase.from("mood_entries").select("date, stimmung, energie, stress").eq("user_id", user.id),
    ]);

    const countWords = (s: string | null | undefined) =>
      s ? s.trim().split(/\s+/).filter(Boolean).length : 0;

    let wordsThisWeek = 0, wordsLastWeek = 0;
    ((journal14 ?? []) as { date: string; content: string | null }[]).forEach((j) => {
      const w = countWords(j.content);
      if (j.date >= sevenStr && j.date < tomorrowStr) wordsThisWeek += w;
      else if (j.date >= fourteenStr && j.date < sevenStr) wordsLastWeek += w;
    });

    const moods = (moodAll ?? []) as MoodLite[];
    const weekMoods = moods.filter((m) => m.date >= sevenStr && m.date < tomorrowStr);

    let focusMood: { label: string; emoji: string } | null = null;
    if (weekMoods.length > 0) {
      const dims: { key: keyof MoodLite; label: string; emoji: string }[] = [
        { key: "stimmung", label: "zufrieden", emoji: "😊" },
        { key: "energie", label: "energiegeladen", emoji: "⚡" },
        { key: "stress", label: "entspannt", emoji: "🧘" },
      ];
      const scored = dims.map((d) => {
        const avg = weekMoods.reduce((a, m) => a + (m[d.key] as number), 0) / weekMoods.length;
        return { ...d, strength: avg };
      });
      scored.sort((a, b) => b.strength - a.strength);
      focusMood = { label: scored[0].label, emoji: scored[0].emoji };
    }

    // Streak
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

    setStats({
      wordsThisWeek, wordsLastWeek, timeMinutes: 0,
      focusMood,
      streak: s, maxStreak: ms,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return (
    <div className="px-4 pt-6 pb-32 min-h-screen">
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-24 rounded-[16px] mb-3" />
      <Skeleton className="h-24 rounded-[16px] mb-3" />
      <Skeleton className="h-24 rounded-[16px]" />
    </div>
  );

  const motivationText = (() => {
    const a = stats.wordsThisWeek, b = stats.wordsLastWeek;
    if (b > 0 && a > b) {
      const pct = Math.round(((a - b) / b) * 100);
      return `Du schreibst ${pct}% mehr als letzte Woche – das tut dir gut! 💜`;
    }
    return "Jedes Wort zählt. Arkie ist bereit für deinen nächsten Eintrag! 💜";
  })();

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="rounded-[16px] p-4 mb-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-foreground/50 text-[11px] uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-foreground text-[14px] leading-relaxed">{children}</p>
    </div>
  );

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate("/insights")} aria-label="Zurück">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-[22px]">Deine Statistiken</h1>
      </div>

      <Section label="🔥 Streak">
        Aktuell <span className="font-bold">{stats.streak}</span> Tage in Folge.
        Dein bisheriger Rekord: <span className="font-bold">{stats.maxStreak}</span> Tage.
      </Section>

      <Section label="✍️ Der Expressionist">
        Du hast diese Woche <span className="font-bold">{stats.wordsThisWeek}</span> Wörter genutzt, um deine Gedanken zu ordnen.
      </Section>

      <Section label="⏳ Zeit für dich">
        In den letzten 7 Tagen hast du dir <span className="font-bold">{stats.timeMinutes}</span> Minuten bewusst Zeit für dich genommen.
      </Section>

      <Section label="💜 Fokus-Emotion">
        {stats.focusMood ? (
          <>Diese Woche fühlst du dich meistens <span className="font-bold">{stats.focusMood.label}</span> {stats.focusMood.emoji}</>
        ) : (
          <>Noch keine Mood-Daten für diese Woche.</>
        )}
      </Section>

      <Section label="✨ Arkies Motivation">
        {motivationText}
      </Section>
    </div>
  );
};

export default StreakDetailPage;