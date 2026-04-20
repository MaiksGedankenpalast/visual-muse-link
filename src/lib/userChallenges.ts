import { supabase } from "@/integrations/supabase/client";

/* ── shared types ── */
export type ChallengeStatus = "pending" | "completed" | "partial" | "missed";

export interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  is_preset: boolean;
}

export interface UserChallengeRow {
  id: string;
  user_id: string;
  challenge_id: string;
  is_active: boolean;
  added_at: string;
}

export interface DailyLogRow {
  id: string;
  challenge_id: string;
  date: string;
  status: ChallengeStatus;
  notes: string | null;
}

/* ── date helpers ── */
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
export const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/* ── goal → category mapping (mirrors existing app) ── */
const GOAL_CATEGORIES: Record<string, string[]> = {
  "Stress reduzieren": ["mindfulness", "bewegung", "atmung"],
  "Dankbarkeit üben": ["dankbarkeit", "journaling"],
  "Persönlich wachsen": ["reflexion", "lernen"],
  "Kreativität entfalten": ["kreativität", "schreiben"],
  "Besser schlafen": ["schlaf", "abendroutine"],
  "Gefühle verarbeiten": ["emotionen", "journaling"],
};

/**
 * Ensures the user has active challenges. If none exist, auto-seed 3–4 preset
 * challenges matching the user's onboarding goals (fallback: first 3 presets).
 * Returns true if seeding happened.
 */
export async function ensureUserChallengesSeeded(userId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("user_challenges")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_goals")
    .eq("id", userId)
    .single();

  const goals = (profile?.onboarding_goals as string[] | null) ?? [];
  const priorityCats = goals.flatMap((g) => GOAL_CATEGORIES[g] ?? []);

  const { data: presets } = await supabase
    .from("challenges")
    .select("id, category")
    .eq("is_preset", true);

  if (!presets || presets.length === 0) return false;

  const matching = priorityCats.length
    ? presets.filter((p) => priorityCats.includes((p.category ?? "").toLowerCase()))
    : [];
  const pool = matching.length ? matching : presets;

  // Pick up to 4 distinct challenges (spread across categories if possible)
  const picked: string[] = [];
  const seenCats = new Set<string>();
  for (const p of pool) {
    const cat = (p.category ?? "").toLowerCase();
    if (!seenCats.has(cat)) {
      seenCats.add(cat);
      picked.push(p.id);
    }
    if (picked.length >= 4) break;
  }
  if (picked.length < 3) {
    for (const p of pool) {
      if (!picked.includes(p.id)) picked.push(p.id);
      if (picked.length >= 3) break;
    }
  }

  const rows = picked.map((cid) => ({
    user_id: userId,
    challenge_id: cid,
    is_active: true,
  }));
  if (rows.length) {
    await supabase.from("user_challenges").insert(rows);
  }
  return true;
}

/**
 * For every currently-active user challenge that has NO log row for yesterday,
 * insert a 'missed' row. This makes streaks/memory accurate for context purposes.
 */
export async function autoLogMissedYesterday(userId: string): Promise<void> {
  const y = yesterdayStr();

  const { data: activeUC } = await supabase
    .from("user_challenges")
    .select("challenge_id, added_at")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!activeUC || activeUC.length === 0) return;

  // Only challenges that were added on or before yesterday count
  const eligible = activeUC.filter((uc) => uc.added_at.slice(0, 10) <= y);
  if (eligible.length === 0) return;

  const ids = eligible.map((uc) => uc.challenge_id);

  const { data: existingLogs } = await supabase
    .from("daily_completions")
    .select("challenge_id")
    .eq("user_id", userId)
    .eq("date", y)
    .in("challenge_id", ids);

  const loggedIds = new Set((existingLogs ?? []).map((r) => r.challenge_id));
  const toInsert = ids
    .filter((id) => !loggedIds.has(id))
    .map((challenge_id) => ({
      user_id: userId,
      challenge_id,
      date: y,
      status: "missed" as ChallengeStatus,
      completed: false,
    }));

  if (toInsert.length > 0) {
    await supabase
      .from("daily_completions")
      .upsert(toInsert, { onConflict: "user_id,challenge_id,date", ignoreDuplicates: true });
  }
}

/**
 * Derives a ChallengeStatus from a logged value vs. target.
 */
export function deriveStatus(loggedValue: number | null | undefined, targetValue: number | null | undefined): ChallengeStatus {
  const logged = Number(loggedValue ?? 0);
  const target = Number(targetValue ?? 0);
  if (!logged || logged <= 0) return "missed";
  if (target > 0 && logged >= target) return "completed";
  if (target > 0 && logged < target) return "partial";
  // No target defined → any positive logged counts as completed
  return "completed";
}

/**
 * Upserts today's log for a challenge with the given status (binary / manual).
 */
export async function setChallengeStatus(
  userId: string,
  challengeId: string,
  status: ChallengeStatus,
  notes?: string
): Promise<void> {
  await supabase.from("daily_completions").upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      date: todayStr(),
      status,
      completed: status === "completed",
      notes: notes ?? null,
    },
    { onConflict: "user_id,challenge_id,date" }
  );
}

/**
 * Upserts today's log for a quantifiable challenge. Status is auto-derived
 * from the logged value vs. the target.
 */
export async function setChallengeQuantity(
  userId: string,
  challengeId: string,
  loggedValue: number,
  targetValue: number | null,
  notes?: string
): Promise<ChallengeStatus> {
  const safeLogged = Math.max(0, Number.isFinite(loggedValue) ? loggedValue : 0);
  const status = deriveStatus(safeLogged, targetValue);
  await supabase.from("daily_completions").upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      date: todayStr(),
      status,
      completed: status === "completed",
      logged_value: safeLogged,
      target_value: targetValue,
      notes: notes ?? null,
    },
    { onConflict: "user_id,challenge_id,date" }
  );
  return status;
}

/**
 * Adds a challenge to the user's active list (re-activates if previously deactivated).
 */
export async function addUserChallenge(userId: string, challengeId: string): Promise<void> {
  await supabase.from("user_challenges").upsert(
    { user_id: userId, challenge_id: challengeId, is_active: true },
    { onConflict: "user_id,challenge_id" }
  );
}

/**
 * Sets is_active=false on a user's challenge (keeps history).
 */
export async function removeUserChallenge(userId: string, challengeId: string): Promise<void> {
  await supabase
    .from("user_challenges")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("challenge_id", challengeId);
}
