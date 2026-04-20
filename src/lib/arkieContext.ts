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

export interface ChallengeLogCtx {
  date: string;
  title: string;
  status: string;
  notes?: string;
}

export interface ChallengeContext {
  recent: ChallengeLogCtx[]; // last 7 days, grouped/sorted
  active: string[]; // active challenge titles
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

export async function fetchArkieContext(userId: string): Promise<{
  moods: MoodCtx[];
  journals: JournalCtx[];
  challenges: ChallengeContext;
}> {
  // 7-day window for challenge logs
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenCutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const [moodRes, journalRes, logRes, activeRes] = await Promise.all([
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
    supabase
      .from("daily_completions")
      .select("date, status, notes, challenge_id, challenges!inner(title)")
      .eq("user_id", userId)
      .gte("date", sevenCutoff)
      .order("date", { ascending: false })
      .limit(40),
    supabase
      .from("user_challenges")
      .select("challenge_id, challenges!inner(title)")
      .eq("user_id", userId)
      .eq("is_active", true),
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

  const recent: ChallengeLogCtx[] = (logRes.data ?? []).map((l: any) => ({
    date: l.date,
    title: l.challenges?.title ?? "Challenge",
    status: l.status ?? "pending",
    notes: l.notes ?? undefined,
  }));
  const active: string[] = (activeRes.data ?? [])
    .map((r: any) => r.challenges?.title)
    .filter((t: unknown): t is string => typeof t === "string");

  const challenges: ChallengeContext = { recent, active };

  // Token budget check (~2000 tokens for moods+journals; challenge block ≤400)
  const combined =
    JSON.stringify(moods) + JSON.stringify(journals) + JSON.stringify(challenges);
  if (estimateTokens(combined) > 2400) {
    journals = journals.slice(0, 5);
  }

  return { moods, journals, challenges };
}
