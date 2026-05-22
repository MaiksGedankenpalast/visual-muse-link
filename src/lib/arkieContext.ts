import { supabase } from "@/integrations/supabase/client";

export interface MoodCtx {
  date: string;
  label: string;
  score: number;
  notes?: string;
}

export interface JournalCtx {
  date: string;
  excerpt: string;
}

export interface ReviewCtx {
  label: string; // e.g. "Woche 4 (14.04.–20.04.)"
  excerpt: string; // truncated to 400 chars
}

export interface ReviewsCtx {
  weekly: ReviewCtx | null;
  fourWeekly: ReviewCtx | null;
}

const SLIDER_KEYS = [
  "happy_sad",
  "calm_anxious",
  "confident_insecure",
  "excited_bored",
  "rested_tired",
] as const;

function moodLabel(score: number): string {
  if (score >= 75) return "sehr gut";
  if (score >= 60) return "gut";
  if (score >= 45) return "neutral";
  if (score >= 30) return "gedrückt";
  return "schwer";
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

export async function fetchArkieContext(userId: string): Promise<{
  moods: MoodCtx[];
  journals: JournalCtx[];
  reviews: ReviewsCtx;
}> {
  const [moodRes, journalRes, weeklyRes, fourWeeklyRes] = await Promise.all([
    supabase
      .from("mood_entries")
      .select("date, happy_sad, calm_anxious, confident_insecure, excited_bored, rested_tired, tags")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(14),
    supabase
      .from("journal_entries")
      .select("date, title, content")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("reviews")
      .select("period_start, period_end, llm_narrative")
      .eq("user_id", userId)
      .eq("type", "weekly")
      .eq("status", "complete")
      .order("period_end", { ascending: false })
      .limit(1),
    supabase
      .from("reviews")
      .select("period_start, period_end, llm_narrative")
      .eq("user_id", userId)
      .eq("type", "four_weekly")
      .eq("status", "complete")
      .order("period_end", { ascending: false })
      .limit(1),
  ]);

  const moods: MoodCtx[] = (moodRes.data ?? []).map((m: any) => {
    const avg =
      SLIDER_KEYS.reduce((sum, k) => sum + (m[k] ?? 50), 0) / SLIDER_KEYS.length;
    const score = Math.round(avg);
    return {
      date: m.date,
      label: moodLabel(score),
      score,
      notes: Array.isArray(m.tags) && m.tags.length ? m.tags.join(", ") : undefined,
    };
  });

  let journals: JournalCtx[] = (journalRes.data ?? []).map((j: any) => {
    const text = [j.title, j.content].filter(Boolean).join(" — ");
    return {
      date: j.date,
      excerpt: text.slice(0, 300),
    };
  });

  const weeklyRow = (weeklyRes.data ?? [])[0] as any;
  const fourRow = (fourWeeklyRes.data ?? [])[0] as any;
  const reviews: ReviewsCtx = {
    weekly: weeklyRow
      ? {
          label: `Woche (${formatShort(weeklyRow.period_start)}–${formatShort(weeklyRow.period_end)})`,
          excerpt: String(weeklyRow.llm_narrative ?? "").slice(0, 400),
        }
      : null,
    fourWeekly: fourRow
      ? {
          label: `4-Wochen-Rückblick (${formatShort(fourRow.period_start)}–${formatShort(fourRow.period_end)})`,
          excerpt: String(fourRow.llm_narrative ?? "").slice(0, 400),
        }
      : null,
  };

  // Token budget check
  const combined = JSON.stringify(moods) + JSON.stringify(journals);
  if (estimateTokens(combined) > 2400) {
    journals = journals.slice(0, 5);
  }

  return { moods, journals, reviews };
}
