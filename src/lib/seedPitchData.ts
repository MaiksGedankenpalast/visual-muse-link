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
  // Day 0 = today, Day 13 = oldest
  // Start negative/mixed → end positive
  const moodProgression = [
    // Day 13 (oldest) - stressed, overwhelmed
    {
      happy_sad: 30,
      calm_anxious: 25,
      confident_insecure: 35,
      excited_bored: 40,
      rested_tired: 25,
      tags: ["Gestresst", "Erschöpft"],
    },
    // Day 12
    {
      happy_sad: 28,
      calm_anxious: 30,
      confident_insecure: 30,
      excited_bored: 35,
      rested_tired: 30,
      tags: ["Überfordert", "Nachdenklich"],
    },
    // Day 11
    {
      happy_sad: 35,
      calm_anxious: 32,
      confident_insecure: 38,
      excited_bored: 42,
      rested_tired: 35,
      tags: ["Gestresst"],
    },
    // Day 10 - first small improvement
    {
      happy_sad: 40,
      calm_anxious: 38,
      confident_insecure: 42,
      excited_bored: 45,
      rested_tired: 40,
      tags: ["Nachdenklich", "Hoffnungsvoll"],
    },
    // Day 9
    { happy_sad: 42, calm_anxious: 45, confident_insecure: 40, excited_bored: 48, rested_tired: 42, tags: ["Ruhig"] },
    // Day 8
    { happy_sad: 48, calm_anxious: 50, confident_insecure: 45, excited_bored: 50, rested_tired: 48, tags: ["Dankbar"] },
    // Day 7 - one week mark, noticeable improvement
    {
      happy_sad: 52,
      calm_anxious: 55,
      confident_insecure: 50,
      excited_bored: 55,
      rested_tired: 50,
      tags: ["Motiviert", "Dankbar"],
    },
    // Day 6
    {
      happy_sad: 55,
      calm_anxious: 52,
      confident_insecure: 55,
      excited_bored: 58,
      rested_tired: 55,
      tags: ["Ruhig", "Zufrieden"],
    },
    // Day 5
    {
      happy_sad: 60,
      calm_anxious: 58,
      confident_insecure: 60,
      excited_bored: 62,
      rested_tired: 58,
      tags: ["Glücklich"],
    },
    // Day 4
    {
      happy_sad: 58,
      calm_anxious: 62,
      confident_insecure: 58,
      excited_bored: 55,
      rested_tired: 60,
      tags: ["Nachdenklich", "Ruhig"],
    },
    // Day 3
    {
      happy_sad: 65,
      calm_anxious: 65,
      confident_insecure: 62,
      excited_bored: 68,
      rested_tired: 62,
      tags: ["Motiviert", "Selbstsicher"],
    },
    // Day 2
    {
      happy_sad: 68,
      calm_anxious: 70,
      confident_insecure: 65,
      excited_bored: 70,
      rested_tired: 68,
      tags: ["Dankbar", "Glücklich"],
    },
    // Day 1 (yesterday)
    {
      happy_sad: 72,
      calm_anxious: 68,
      confident_insecure: 70,
      excited_bored: 72,
      rested_tired: 70,
      tags: ["Zufrieden", "Motiviert"],
    },
    // Day 0 (today)
    {
      happy_sad: 75,
      calm_anxious: 72,
      confident_insecure: 73,
      excited_bored: 75,
      rested_tired: 72,
      tags: ["Glücklich", "Dankbar", "Selbstsicher"],
    },
  ];

  const moodEntries = moodProgression.map((m, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return { user_id: userId, date: d.toISOString().slice(0, 10), ...m };
  });
  await supabase.from("mood_entries").insert(moodEntries);

  // ── Journal entries - realistic, emotional, showing growth ──
  const journals = [];

  const journalEntries = journals.map((j) => {
    const d = new Date(today);
    d.setDate(today.getDate() - j.daysAgo);
    const dateStr = d.toISOString().slice(0, 10);
    const moodEntry = moodEntries.find((m) => m.date === dateStr);
    const moodSnapshot = moodEntry
      ? Math.round(
          (moodEntry.happy_sad +
            moodEntry.calm_anxious +
            moodEntry.confident_insecure +
            moodEntry.excited_bored +
            moodEntry.rested_tired) /
            5,
        )
      : null;
    return {
      user_id: userId,
      title: j.title,
      content: j.content,
      category: j.category,
      date: dateStr,
      mood_snapshot: moodSnapshot,
    };
  });
  await supabase.from("journal_entries").insert(journalEntries);

  // ── Challenges: activate 4 presets + generate completion history ──
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, category")
    .eq("is_preset", true)
    .limit(10);

  if (challenges && challenges.length > 0) {
    const activeChallenges = challenges.slice(0, 4);

    await supabase.from("user_challenges").upsert(
      activeChallenges.map((c) => ({
        user_id: userId,
        challenge_id: c.id,
        is_active: true,
      })),
      { onConflict: "user_id,challenge_id" }
    );

    type Status = "completed" | "partial" | "missed" | "pending";
    const completionEntries: Array<{
      user_id: string;
      challenge_id: string;
      date: string;
      status: Status;
      completed: boolean;
    }> = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      for (let j = 0; j < activeChallenges.length; j++) {
        let status: Status;
        if (i >= 10) {
          const r = Math.random();
          status = r < 0.5 ? "missed" : r < 0.8 ? "partial" : "completed";
        } else if (i >= 5) {
          const r = Math.random();
          status = r < 0.2 ? "missed" : r < 0.45 ? "partial" : "completed";
        } else if (i === 0) {
          status = j < 2 ? "completed" : "pending";
        } else {
          const r = Math.random();
          status = r < 0.1 ? "partial" : "completed";
        }
        completionEntries.push({
          user_id: userId,
          challenge_id: activeChallenges[j].id,
          date: dateStr,
          status,
          completed: status === "completed",
        });
      }
    }
    await supabase
      .from("daily_completions")
      .upsert(completionEntries, { onConflict: "user_id,challenge_id,date" });
  }

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
    supabase.from("daily_completions").delete().eq("user_id", userId),
    supabase.from("vibe_items").delete().eq("user_id", userId),
    supabase.from("challenges").delete().eq("user_id", userId).eq("is_preset", false),
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
