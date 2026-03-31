import { supabase } from "@/integrations/supabase/client";

export async function seedDevData(userId: string) {
  // Check if already seeded
  const { count } = await supabase.from("mood_entries").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (count && count >= 7) return; // already seeded

  // Update profile
  await supabase.from("profiles").update({
    name: "Maik",
    onboarding_complete: true,
    onboarding_goals: ["Stress reduzieren", "Besser schlafen", "Persönlich wachsen"],
  }).eq("id", userId);

  const today = new Date();

  // 14 days of mood entries
  const moodEntries = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const base = 30 + Math.floor(Math.random() * 40); // 30-70 range
    const tags = [["Dankbar", "Ruhig"], ["Motiviert"], ["Erschöpft", "Gestresst"], ["Glücklich"], ["Ruhig", "Dankbar"]][i % 5];
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

  // 8 journal entries
  const journals = [
    { title: "Ein guter Start", content: "Heute war ein richtig guter Tag. Ich habe viel geschafft.", category: "Persönlich", daysAgo: 0 },
    { title: "Gedanken zum Abend", content: "Manchmal brauche ich einfach Ruhe. Heute war so ein Tag.", category: "Persönlich", daysAgo: 1 },
    { title: "Projekt Idee", content: "Mir ist eine tolle Idee gekommen für ein neues Projekt.", category: "Ideen", daysAgo: 3 },
    { title: "Dankbarkeit", content: "Ich bin dankbar für die kleinen Momente heute.", category: "Dankbarkeit", daysAgo: 4 },
    { title: "Meeting Notizen", content: "Das Meeting lief gut. Nächste Schritte sind klar.", category: "Work", daysAgo: 6 },
    { title: "Reflexion", content: "Was ich diese Woche gelernt habe.", category: "Reflexion", daysAgo: 8 },
    { title: "Kreative Pause", content: "Einfach mal zeichnen und Musik hören.", category: "Persönlich", daysAgo: 10 },
    { title: "Wochenrückblick", content: "Eine gemischte Woche. Aber ich bin zufrieden.", category: "Reflexion", daysAgo: 12 },
  ];
  const journalEntries = journals.map((j) => {
    const d = new Date(today); d.setDate(today.getDate() - j.daysAgo);
    const moodEntry = moodEntries.find((m) => m.date === d.toISOString().slice(0, 10));
    const moodSnapshot = moodEntry ? Math.round((moodEntry.happy_sad + moodEntry.calm_anxious + moodEntry.confident_insecure + moodEntry.excited_bored + moodEntry.rested_tired) / 5) : null;
    return {
      user_id: userId,
      title: j.title,
      content: j.content,
      category: j.category,
      date: d.toISOString().slice(0, 10),
      mood_snapshot: moodSnapshot,
    };
  });
  await supabase.from("journal_entries").insert(journalEntries);

  // Get preset challenges and add completions
  const { data: challenges } = await supabase.from("challenges").select("id, category").eq("is_preset", true).limit(10);
  if (challenges && challenges.length > 0) {
    const completionEntries = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      // 1-3 challenges per day
      const numChallenges = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numChallenges && j < challenges.length; j++) {
        completionEntries.push({
          user_id: userId,
          challenge_id: challenges[j].id,
          date: dateStr,
          completed: Math.random() > 0.2, // 80% completed
        });
      }
    }
    // limit to ~20
    await supabase.from("daily_completions").insert(completionEntries.slice(0, 20));
  }
}
