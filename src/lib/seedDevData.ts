import { supabase } from "@/integrations/supabase/client";

/**
 * Seeds 14 days of mood entries for the dev user (dev@mindark.app).
 * Skips if any data already exists.
 */
export async function seedDevData(userId: string) {
  const [{ count: moodCount }, { count: journalCount }, { count: vibeCount }] = await Promise.all([
    supabase.from("mood_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("vibe_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if ((moodCount && moodCount > 0) || (journalCount && journalCount > 0) || (vibeCount && vibeCount > 0)) {
    return;
  }

  await supabase
    .from("profiles")
    .update({
      name: "Maik",
      onboarding_complete: true,
      onboarding_goals: ["Stress reduzieren", "Besser schlafen", "Persönlich wachsen"],
    })
    .eq("id", userId);

  const today = new Date();
  const moodEntries = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const base = 30 + Math.floor(Math.random() * 40);
    const tagsPool = [["Dankbar", "Ruhig"], ["Motiviert"], ["Erschöpft", "Gestresst"], ["Glücklich"], ["Ruhig", "Dankbar"]];
    const tags = tagsPool[i % tagsPool.length];
    moodEntries.push({
      user_id: userId,
      date: dateStr,
      happy_sad: Math.max(5, Math.min(95, base + Math.floor(Math.random() * 20 - 10))),
      calm_anxious: Math.max(5, Math.min(95, base + Math.floor(Math.random() * 20 - 10))),
      confident_insecure: Math.max(5, Math.min(95, base + Math.floor(Math.random() * 20 - 10))),
      excited_bored: Math.max(5, Math.min(95, base + Math.floor(Math.random() * 20 - 10))),
      rested_tired: Math.max(5, Math.min(95, base + Math.floor(Math.random() * 20 - 10))),
      tags,
    });
  }
  await supabase.from("mood_entries").insert(moodEntries);
}