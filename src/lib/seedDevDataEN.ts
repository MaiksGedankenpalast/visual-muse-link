import { supabase } from "@/integrations/supabase/client";

/**
 * Seeds 16 days of pitch-ready demo data for the English dev user (dev-en@mindark.app).
 * Two mood entries per day (morning + evening), mostly upward trend with realistic dips,
 * ~12 journal entries in English, plus one Arkie weekly letter.
 * Skips if data already exists.
 */
export async function seedDevDataEN(userId: string) {
  const [{ count: moodCount }, { count: journalCount }, { count: reviewCount }] = await Promise.all([
    supabase.from("mood_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if ((moodCount && moodCount > 0) || (journalCount && journalCount > 0) || (reviewCount && reviewCount > 0)) {
    return;
  }

  await supabase
    .from("profiles")
    .update({
      name: "Alex",
      onboarding_complete: true,
      onboarding_goals: ["Reduce stress", "Sleep better", "Grow personally"],
    })
    .eq("id", userId);

  const today = new Date();
  const DAYS = 16;
  const clamp = (n: number) => Math.max(8, Math.min(95, Math.round(n)));
  const jitter = (amt: number) => (Math.random() * 2 - 1) * amt;

  // ---------- MOOD ENTRIES: 2 per day, mostly upward trend with realistic ups/downs ----------
  const moodRows: any[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Progress from 0 (day 0 = 16 days ago) to 1 (today)
    const progress = (DAYS - 1 - i) / (DAYS - 1);
    // Base trend rises from ~38 to ~78
    const trend = 38 + progress * 40;
    // Add a couple of dips so it's not perfectly linear
    const dipDays = [3, 8, 12];
    const dip = dipDays.includes(DAYS - 1 - i) ? -15 : 0;

    for (let slot = 0; slot < 2; slot++) {
      const slotBoost = slot === 1 ? 4 : 0; // evening slightly better usually
      const stimmung = clamp(trend + dip + slotBoost + jitter(8));
      const energie = clamp(trend + dip + jitter(10) - 3);
      const stress = clamp(95 - trend - dip + jitter(10));
      const created = new Date(d);
      created.setHours(slot === 0 ? 9 : 20, Math.floor(Math.random() * 50), 0, 0);

      const tagsPoolPos = [["Grateful", "Calm"], ["Motivated"], ["Happy"], ["Calm", "Grateful"], ["Focused"]];
      const tagsPoolNeg = [["Exhausted", "Stressed"], ["Anxious"], ["Tired"], ["Overwhelmed"]];
      const tags = stimmung >= 55 ? tagsPoolPos[Math.floor(Math.random() * tagsPoolPos.length)] : tagsPoolNeg[Math.floor(Math.random() * tagsPoolNeg.length)];

      moodRows.push({
        user_id: userId,
        date: dateStr,
        created_at: created.toISOString(),
        eingabe_typ: slot === 0 ? "schnell" : "tief",
        stimmung,
        energie,
        stress,
        pos_zufriedenheit: slot === 1 ? clamp(stimmung + jitter(6)) : null,
        pos_motivation: slot === 1 ? clamp(energie + jitter(8)) : null,
        pos_dankbarkeit: slot === 1 ? clamp(stimmung + jitter(8)) : null,
        pos_verbundenheit: slot === 1 ? clamp(stimmung + jitter(10) - 5) : null,
        neg_erschoepfung: slot === 1 ? clamp(100 - energie + jitter(8)) : null,
        neg_angst: slot === 1 ? clamp(stress + jitter(10) - 10) : null,
        neg_traurigkeit: slot === 1 ? clamp(100 - stimmung + jitter(10) - 10) : null,
        neg_einsamkeit: slot === 1 ? clamp(100 - stimmung + jitter(12) - 15) : null,
        tags,
      });
    }
  }
  const { error: moodErr } = await supabase.from("mood_entries").insert(moodRows);
  if (moodErr) console.error("[seedDevDataEN] mood insert failed:", moodErr);

  // ---------- JOURNAL ENTRIES (English, ~12 over 16 days) ----------
  const journals = [
    { offset: 15, title: "Starting fresh", category: "Reflection", content: "Decided to actually take care of my head this time. Work has been a blur lately and I keep going to bed thinking about tomorrow. Going to try writing here every couple of days and see what happens.", mood: 40 },
    { offset: 14, title: "Tough Monday", category: "Stress", content: "Long meeting, three new tickets dropped on me right before lunch. I noticed my jaw was clenched the whole afternoon. At least I took a real walk after work instead of doomscrolling.", mood: 35 },
    { offset: 12, title: "Small win", category: "Gratitude", content: "Got through my inbox without spiraling. Mom called and we actually laughed about something silly. Feeling a little lighter tonight.", mood: 58 },
    { offset: 11, title: "Bad night", category: "Sleep", content: "Couldn't fall asleep until 2am. Brain kept replaying that awkward thing I said in the standup. I know it doesn't matter but it felt huge at the time.", mood: 32 },
    { offset: 9, title: "Reset day", category: "Self-care", content: "Took the morning slow. Made real coffee, no phone for an hour. It's wild how much calmer I feel when I don't start the day reacting to things.", mood: 65 },
    { offset: 8, title: "Talked to Sam", category: "Connection", content: "Met Sam for dinner. Told them honestly that I've been struggling. They didn't try to fix it, just listened. I think I needed that more than advice.", mood: 70 },
    { offset: 6, title: "Running again", category: "Body", content: "First run in three weeks. Slow, embarrassing, glorious. The trees by the canal are starting to turn. Felt like the version of me I want to be was waiting out there.", mood: 72 },
    { offset: 5, title: "Setback", category: "Stress", content: "Client pushed back hard on the proposal. Old me would've spiraled all night. I still spiraled, just for shorter. Progress?", mood: 45 },
    { offset: 3, title: "Better sleep", category: "Sleep", content: "Phone in the kitchen, lights off by 11. Slept seven straight hours and woke up actually rested. Going to keep this going.", mood: 74 },
    { offset: 2, title: "Grateful list", category: "Gratitude", content: "Three things: the good bread from the bakery, my partner laughing at my terrible joke, the quiet 20 minutes I had on the balcony this morning. Tiny stuff, but it adds up.", mood: 78 },
    { offset: 1, title: "Pattern noticed", category: "Reflection", content: "Looking back at this week I can see it: when I move my body and sleep enough, everything else gets easier. Not a revelation, but feeling it instead of just knowing it is different.", mood: 76 },
    { offset: 0, title: "Today", category: "Reflection", content: "Calm morning. Got the big task done before lunch. Going to stop here and not push my luck. Two weeks ago I couldn't have imagined a day feeling this manageable.", mood: 80 },
  ];
  const journalRows = journals.map((j) => {
    const d = new Date(today);
    d.setDate(today.getDate() - j.offset);
    const created = new Date(d);
    created.setHours(21, Math.floor(Math.random() * 50), 0, 0);
    return {
      user_id: userId,
      date: d.toISOString().slice(0, 10),
      created_at: created.toISOString(),
      title: j.title,
      content: j.content,
      category: j.category,
      mood_snapshot: j.mood,
    };
  });
  const { error: journalErr } = await supabase.from("journal_entries").insert(journalRows);
  if (journalErr) console.error("[seedDevDataEN] journal insert failed:", journalErr);

  // ---------- ARKIE WEEKLY LETTER ----------
  const periodEnd = new Date(today);
  periodEnd.setDate(today.getDate() - 1);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodEnd.getDate() - 6);

  const narrative = `Hey Alex,

I've been sitting with your week, and I wanted to write to you about what I noticed.

You started this stretch carrying a lot. Monday's clenched jaw, the 2am scroll, the way one rough comment in standup grew teeth in your head at night — that was real, and you didn't pretend otherwise. That honesty matters. It's the part most people skip.

But something shifted around midweek. You took a slow morning. You called Sam and let yourself be heard instead of performing okay. You laced up and ran, badly and beautifully. And then you slept — really slept — for the first time in a while.

Here's the pattern I see: on the days you moved your body and protected your sleep, everything downstream got softer. Your stress numbers dropped about 22% on those days. Your gratitude entries got longer. Even the client setback didn't swallow a whole evening like it would have two weeks ago.

You wrote, "feeling it instead of just knowing it is different." That line is the whole week to me. You're not learning new ideas. You're letting old ideas finally land in your body.

One thing to keep an eye on: connection. Your numbers there are still the quietest of the group. The Sam dinner moved them more than anything else this week. Worth noticing.

I'm proud of you. Keep going gently.

— Arkie`;

  const { error: reviewErr } = await supabase.from("reviews").insert({
    user_id: userId,
    type: "weekly",
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: periodEnd.toISOString().slice(0, 10),
    llm_narrative: narrative,
    status: "complete",
    generated_at: new Date().toISOString(),
    stats_snapshot: {
      avg_stimmung: 62,
      avg_energie: 58,
      avg_stress: 42,
      entries_count: 14,
      journal_count: 6,
    },
  });
  if (reviewErr) console.error("[seedDevDataEN] review insert failed:", reviewErr);
}