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

/**
 * Rough char-based token estimate (1 token ≈ 4 chars).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function fetchArkieContext(userId: string): Promise<{
  moods: MoodCtx[];
  journals: JournalCtx[];
}> {
  // Fetch in parallel
  const [moodRes, journalRes] = await Promise.all([
    supabase
      .from("mood_entries")
      .select("date, happy_sad, calm_anxious, confident_insecure, excited_bored, rested_tired, tags")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(14),
    supabase
      .from("journal_entries")
      .select("date, title, content")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
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

  // Token budget check (~2000 tokens). If exceeded, reduce journals to 5.
  const combined =
    JSON.stringify(moods) + JSON.stringify(journals);
  if (estimateTokens(combined) > 2000) {
    journals = journals.slice(0, 5);
  }

  return { moods, journals };
}
