import { supabase } from "@/integrations/supabase/client";
import { fetchArkieContext } from "@/lib/arkieContext";

export interface SmartChallengeRow {
  id: string;
  user_id: string;
  date: string;
  challenge_text: string;
  rationale: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export async function getTodaySmartChallenge(userId: string): Promise<SmartChallengeRow | null> {
  const { data } = await supabase
    .from("smart_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("date", todayStr())
    .maybeSingle();
  return (data as SmartChallengeRow | null) ?? null;
}

/**
 * Check if the user has at least 2 days of data to generate a sensible challenge.
 * Requires ≥2 mood entries OR ≥2 journal entries OR ≥2 challenge logs across different days.
 */
export async function hasEnoughData(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const [moods, journals, logs] = await Promise.all([
    supabase.from("mood_entries").select("date").eq("user_id", userId).gte("date", cutoff),
    supabase.from("journal_entries").select("date").eq("user_id", userId).gte("date", cutoff),
    supabase.from("daily_completions").select("date").eq("user_id", userId).gte("date", cutoff),
  ]);

  const uniqDays = (rows: Array<{ date: string }> | null) =>
    new Set((rows ?? []).map((r) => r.date)).size;

  return (
    uniqDays(moods.data as any) >= 2 ||
    uniqDays(journals.data as any) >= 2 ||
    uniqDays(logs.data as any) >= 2
  );
}

export async function generateSmartChallenge(
  userId: string,
  userName?: string
): Promise<SmartChallengeRow | null> {
  // Build context from existing arkie context helper
  const ctx = await fetchArkieContext(userId);

  // Also pull last few chat messages (most recent session)
  const { data: lastSession } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let chat: Array<{ role: string; content: string }> = [];
  if (lastSession?.id) {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", lastSession.id)
      .order("created_at", { ascending: false })
      .limit(6);
    chat = ((msgs ?? []) as any[]).reverse();
  }

  const challengeLogs = ctx.challenges.recent.map((l) => ({
    date: l.date,
    title: l.title,
    status: l.status,
    logged_value: l.logged_value,
    target_value: l.target_value,
    unit: l.unit,
  }));

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `https://${projectId}.supabase.co/functions/v1/generate-smart-challenge`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userName,
      moods: ctx.moods,
      journals: ctx.journals,
      challengeLogs,
      chat,
    }),
  });
  if (!resp.ok) {
    console.error("smart-challenge fetch failed", resp.status);
    return null;
  }
  const payload = (await resp.json()) as { challenge_text?: string; rationale?: string };
  if (!payload?.challenge_text) return null;

  const { data, error } = await supabase
    .from("smart_challenges")
    .upsert(
      {
        user_id: userId,
        date: todayStr(),
        challenge_text: payload.challenge_text,
        rationale: payload.rationale ?? null,
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();
  if (error) {
    console.error("smart-challenge insert failed", error);
    return null;
  }
  return data as SmartChallengeRow;
}

export async function toggleSmartChallengeCompleted(
  id: string,
  completed: boolean
): Promise<void> {
  await supabase
    .from("smart_challenges")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id);
}