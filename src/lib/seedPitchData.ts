import { supabase } from "@/integrations/supabase/client";

/**
 * Seeds realistic demo data for a BSS pitch presentation.
 * Shows a 14-day positive mood progression with rich journal entries.
 */
export async function seedPitchData(userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Update profile
  await supabase
    .from("profiles")
    .update({
      name: "Mein Freund",
      onboarding_complete: true,
      onboarding_goals: ["Stress reduzieren", "Persönlich wachsen", "Dankbarkeit üben"],
    })
    .eq("id", userId);

  // ── 14 days of mood entries with POSITIVE PROGRESSION ──
  // Day 0 = today (most recent), Day 13 = oldest
  // New schema: 0 = bad, 100 = good for stimmung/energie/stress
  const moodProgression: Array<{
    stimmung: number;
    energie: number;
    stress: number;
    tags: string[];
  }> = [
    { stimmung: 30, energie: 28, stress: 25, tags: ["Gestresst", "Erschöpft"] },
    { stimmung: 32, energie: 30, stress: 28, tags: ["Überfordert", "Nachdenklich"] },
    { stimmung: 38, energie: 35, stress: 32, tags: ["Gestresst"] },
    { stimmung: 42, energie: 40, stress: 40, tags: ["Nachdenklich", "Hoffnungsvoll"] },
    { stimmung: 45, energie: 45, stress: 48, tags: ["Ruhig"] },
    { stimmung: 52, energie: 50, stress: 52, tags: ["Dankbar"] },
    { stimmung: 58, energie: 55, stress: 55, tags: ["Motiviert", "Dankbar"] },
    { stimmung: 60, energie: 58, stress: 58, tags: ["Ruhig", "Zufrieden"] },
    { stimmung: 65, energie: 62, stress: 60, tags: ["Glücklich"] },
    { stimmung: 63, energie: 60, stress: 65, tags: ["Nachdenklich", "Ruhig"] },
    { stimmung: 70, energie: 68, stress: 65, tags: ["Motiviert", "Selbstsicher"] },
    { stimmung: 72, energie: 70, stress: 70, tags: ["Dankbar", "Glücklich"] },
    { stimmung: 75, energie: 72, stress: 72, tags: ["Zufrieden", "Motiviert"] },
    { stimmung: 78, energie: 75, stress: 75, tags: ["Glücklich", "Dankbar", "Selbstsicher"] },
  ];

  const moodEntries = moodProgression.map((m, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return {
      user_id: userId,
      date: d.toISOString().slice(0, 10),
      eingabe_typ: "schnell" as const,
      stimmung: m.stimmung,
      energie: m.energie,
      stress: m.stress,
      tags: m.tags,
    };
  });
  await supabase.from("mood_entries").insert(moodEntries);

  // ── Vibe items (today + yesterday) ──
  const vibeToday = [
    { text: "Morgenmeditation 🧘", completed: true },
    { text: "Lisa zum Abendessen einladen", completed: false },
    { text: "30 Min spazieren gehen", completed: true },
    { text: "Pitch-Präsentation vorbereiten", completed: false },
  ];
  const vibeYesterday = [
    { text: "Atemübung machen", completed: true },
    { text: "Dankbarkeitsliste schreiben", completed: true },
    { text: "Früh ins Bett gehen", completed: true },
  ];

  const vibeEntries = [
    ...vibeToday.map((v) => ({
      user_id: userId,
      text: v.text,
      date: todayStr,
      completed: v.completed,
      is_suggestion: false,
    })),
    ...vibeYesterday.map((v) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 1);
      return {
        user_id: userId,
        text: v.text,
        date: d.toISOString().slice(0, 10),
        completed: v.completed,
        is_suggestion: false,
      };
    }),
  ];
  await supabase.from("vibe_items").insert(vibeEntries);
}

/**
 * Deletes ALL data for a user so pitch can be reset and re-run.
 */
export async function resetPitchData(userId: string) {
  await Promise.all([
    supabase.from("mood_entries").delete().eq("user_id", userId),
    supabase.from("journal_entries").delete().eq("user_id", userId),
    supabase.from("vibe_items").delete().eq("user_id", userId),
    supabase.from("chat_messages").delete().eq("user_id", userId),
    supabase.from("chat_sessions").delete().eq("user_id", userId),
  ]);
  await supabase
    .from("profiles")
    .update({
      onboarding_complete: false,
      onboarding_goals: null,
      name: null,
    })
    .eq("id", userId);
}
