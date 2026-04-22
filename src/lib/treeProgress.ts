import { supabase } from "@/integrations/supabase/client";

export type TreeRow = {
  id: string;
  user_id: string;
  points: number;
  current_phase: number;
  last_chat_award_at: string | null;
  last_update: string;
  created_at: string;
};

export const PHASE_RANGES = [
  { phase: 1, min: 0, max: 500, label: "Keimling" },
  { phase: 2, min: 501, max: 1500, label: "Sapling" },
  { phase: 3, min: 1501, max: 5000, label: "Junger Baum" },
  { phase: 4, min: 5001, max: 15000, label: "Blühend" },
  { phase: 5, min: 15001, max: Infinity, label: "Archiv-Baum" },
] as const;

export function phaseFromPoints(points: number): number {
  if (points >= 15001) return 5;
  if (points >= 5001) return 4;
  if (points >= 1501) return 3;
  if (points >= 501) return 2;
  return 1;
}

export async function getOrCreateTreeProgress(userId: string): Promise<TreeRow | null> {
  const { data } = await supabase
    .from("tree_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as TreeRow;
  const { data: created } = await supabase
    .from("tree_progress")
    .insert({ user_id: userId, points: 0, current_phase: 1 })
    .select("*")
    .maybeSingle();
  return (created ?? null) as TreeRow | null;
}

/**
 * Silent points award. Failures are swallowed so no user-facing flow breaks.
 * `kind` "chat" is throttled to once per 24h via last_chat_award_at.
 */
export async function awardPoints(
  userId: string | undefined | null,
  amount: number,
  kind: "journal" | "challenge" | "challenge_note" | "mood" | "chat"
): Promise<void> {
  if (!userId || amount <= 0) return;
  try {
    const row = await getOrCreateTreeProgress(userId);
    if (!row) return;

    if (kind === "chat") {
      if (row.last_chat_award_at) {
        const last = new Date(row.last_chat_award_at).getTime();
        if (Date.now() - last < 24 * 60 * 60 * 1000) return;
      }
    }

    const next = row.points + amount;
    const update: Record<string, unknown> = { points: next };
    if (kind === "chat") update.last_chat_award_at = new Date().toISOString();

    await supabase.from("tree_progress").update(update).eq("user_id", userId);
  } catch {
    /* silent */
  }
}
