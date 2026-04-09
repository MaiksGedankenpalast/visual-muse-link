import { supabase } from "@/integrations/supabase/client";

/**
 * Seeds realistic demo data for a BSS pitch presentation.
 * Shows a 14-day positive mood progression with rich journal entries.
 */
export async function seedPitchData(userId: string) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Update profile
  await supabase.from("profiles").update({
    name: "Mein Freund",
    onboarding_complete: true,
    onboarding_goals: ["Stress reduzieren", "Persönlich wachsen", "Dankbarkeit üben"],
  }).eq("id", userId);

  // ── 14 days of mood entries with POSITIVE PROGRESSION ──
  // Day 0 = today, Day 13 = oldest
  // Start negative/mixed → end positive
  const moodProgression = [
    // Day 13 (oldest) - stressed, overwhelmed
    { happy_sad: 30, calm_anxious: 25, confident_insecure: 35, excited_bored: 40, rested_tired: 25, tags: ["Gestresst", "Erschöpft"] },
    // Day 12
    { happy_sad: 28, calm_anxious: 30, confident_insecure: 30, excited_bored: 35, rested_tired: 30, tags: ["Überfordert", "Nachdenklich"] },
    // Day 11
    { happy_sad: 35, calm_anxious: 32, confident_insecure: 38, excited_bored: 42, rested_tired: 35, tags: ["Gestresst"] },
    // Day 10 - first small improvement
    { happy_sad: 40, calm_anxious: 38, confident_insecure: 42, excited_bored: 45, rested_tired: 40, tags: ["Nachdenklich", "Hoffnungsvoll"] },
    // Day 9
    { happy_sad: 42, calm_anxious: 45, confident_insecure: 40, excited_bored: 48, rested_tired: 42, tags: ["Ruhig"] },
    // Day 8
    { happy_sad: 48, calm_anxious: 50, confident_insecure: 45, excited_bored: 50, rested_tired: 48, tags: ["Dankbar"] },
    // Day 7 - one week mark, noticeable improvement
    { happy_sad: 52, calm_anxious: 55, confident_insecure: 50, excited_bored: 55, rested_tired: 50, tags: ["Motiviert", "Dankbar"] },
    // Day 6
    { happy_sad: 55, calm_anxious: 52, confident_insecure: 55, excited_bored: 58, rested_tired: 55, tags: ["Ruhig", "Zufrieden"] },
    // Day 5
    { happy_sad: 60, calm_anxious: 58, confident_insecure: 60, excited_bored: 62, rested_tired: 58, tags: ["Glücklich"] },
    // Day 4
    { happy_sad: 58, calm_anxious: 62, confident_insecure: 58, excited_bored: 55, rested_tired: 60, tags: ["Nachdenklich", "Ruhig"] },
    // Day 3
    { happy_sad: 65, calm_anxious: 65, confident_insecure: 62, excited_bored: 68, rested_tired: 62, tags: ["Motiviert", "Selbstsicher"] },
    // Day 2
    { happy_sad: 68, calm_anxious: 70, confident_insecure: 65, excited_bored: 70, rested_tired: 68, tags: ["Dankbar", "Glücklich"] },
    // Day 1 (yesterday)
    { happy_sad: 72, calm_anxious: 68, confident_insecure: 70, excited_bored: 72, rested_tired: 70, tags: ["Zufrieden", "Motiviert"] },
    // Day 0 (today)
    { happy_sad: 75, calm_anxious: 72, confident_insecure: 73, excited_bored: 75, rested_tired: 72, tags: ["Glücklich", "Dankbar", "Selbstsicher"] },
  ];

  const moodEntries = moodProgression.map((m, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return { user_id: userId, date: d.toISOString().slice(0, 10), ...m };
  });
  await supabase.from("mood_entries").insert(moodEntries);

  // ── Journal entries - realistic, emotional, showing growth ──
  const journals = [
    {
      daysAgo: 13,
      title: "Alles zu viel",
      content: "Heute war einer dieser Tage, an denen alles gleichzeitig kam. Arbeit, private Verpflichtungen, und dann noch der Streit mit Lisa. Ich fühle mich komplett überfordert und weiß nicht, wo ich anfangen soll. Vielleicht hilft es, das hier aufzuschreiben.",
      category: "Persönlich",
    },
    {
      daysAgo: 11,
      title: "Schlaflos und Gedankenkarussell",
      content: "Konnte gestern Nacht kaum schlafen. Die Gedanken hören einfach nicht auf. Das Projekt auf der Arbeit macht mir Sorgen – ich habe das Gefühl, den Erwartungen nicht gerecht zu werden. Aber heute Morgen habe ich zum ersten Mal die Atemübung gemacht. 5 Minuten. Hat sich seltsam angefühlt, aber danach war ich kurz ruhiger.",
      category: "Reflexion",
    },
    {
      daysAgo: 9,
      title: "Kleiner Lichtblick",
      content: "Heute ein gutes Gespräch mit meinem Kollegen Tim gehabt. Er hat mir gesagt, dass er meine Arbeit schätzt. Das hat mich überrascht. Vielleicht bin ich zu hart mit mir selbst. Abends mit Lisa spazieren gegangen – hat gut getan, einfach mal reden ohne Druck.",
      category: "Dankbarkeit",
    },
    {
      daysAgo: 7,
      title: "Eine Woche mit Arkie",
      content: "Ich benutze die App jetzt seit einer Woche. Es fühlt sich gut an, meine Gedanken rauszulassen. Heute beim Mood-Check gemerkt, dass ich tatsächlich ruhiger bin als vor einer Woche. Die Challenge 'Dankbarkeitsliste' hat mir geholfen – ich achte mehr auf die kleinen Dinge.",
      category: "Reflexion",
    },
    {
      daysAgo: 5,
      title: "Mutig gewesen",
      content: "Heute habe ich meinem Chef gesagt, dass ich Unterstützung beim Projekt brauche. Das hat mich Überwindung gekostet, aber er war total verständnisvoll. Warum habe ich das nicht früher gemacht? Manchmal baut man sich Mauern, die gar nicht existieren.",
      category: "Work",
    },
    {
      daysAgo: 3,
      title: "Dankbar für den Moment",
      content: "Heute morgen Kaffee auf dem Balkon getrunken und einfach nur zugehört – Vögel, Wind, Stille. Zum ersten Mal seit Wochen keinen Drang gehabt, sofort aufs Handy zu schauen. Lisa hat gelächelt und gesagt, ich wirke anders. Ruhiger. Das hat mich berührt.",
      category: "Dankbarkeit",
    },
    {
      daysAgo: 1,
      title: "Reflexion am Abend",
      content: "Wenn ich die letzten zwei Wochen anschaue, merke ich einen echten Unterschied. Ich nehme mir mehr Zeit für mich. Die Challenges helfen mir, jeden Tag kleine Schritte zu machen. Morgen will ich das Gespräch mit Papa endlich führen – ich bin bereit.",
      category: "Reflexion",
    },
    {
      daysAgo: 0,
      title: "Heute ist ein guter Tag",
      content: "Aufgewacht und mich zum ersten Mal seit langem richtig ausgeruht gefühlt. Die Morgenroutine wird zur Gewohnheit. Mood-Check zeigt: ich bin glücklicher als vor zwei Wochen. Das motiviert mich weiterzumachen. Danke, Arkie. 💜",
      category: "Persönlich",
    },
  ];

  const journalEntries = journals.map((j) => {
    const d = new Date(today);
    d.setDate(today.getDate() - j.daysAgo);
    const dateStr = d.toISOString().slice(0, 10);
    const moodEntry = moodEntries.find((m) => m.date === dateStr);
    const moodSnapshot = moodEntry
      ? Math.round((moodEntry.happy_sad + moodEntry.calm_anxious + moodEntry.confident_insecure + moodEntry.excited_bored + moodEntry.rested_tired) / 5)
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

  // ── Challenges + completions ──
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, category")
    .eq("is_preset", true)
    .limit(10);

  if (challenges && challenges.length > 0) {
    const completionEntries: Array<{
      user_id: string;
      challenge_id: string;
      date: string;
      completed: boolean;
    }> = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      // More completions as days get more recent (showing engagement growth)
      const numChallenges = i > 10 ? 1 : i > 6 ? 2 : 3;
      for (let j = 0; j < numChallenges && j < challenges.length; j++) {
        completionEntries.push({
          user_id: userId,
          challenge_id: challenges[j].id,
          date: dateStr,
          completed: i < 10 ? true : Math.random() > 0.3,
        });
      }
    }
    await supabase.from("daily_completions").insert(completionEntries.slice(0, 30));
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
  await supabase.from("profiles").update({
    onboarding_complete: false,
    onboarding_goals: null,
    name: null,
  }).eq("id", userId);
}
