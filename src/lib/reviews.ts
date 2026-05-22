import { supabase } from "@/integrations/supabase/client";

export type ReviewType = "weekly" | "four_weekly";
export type ReviewStatus = "pending" | "generating" | "complete" | "error";

export interface ReviewRow {
  id: string;
  user_id: string;
  type: ReviewType;
  period_start: string;
  period_end: string;
  llm_narrative: string | null;
  stats_snapshot: StatsSnapshot | null;
  status: ReviewStatus;
  generated_at: string | null;
  created_at: string;
}

export interface StatsSnapshot {
  mood: {
    total: number;
    avg_score: number | null; // 0-100 scale
    highest: { date: string; score: number } | null;
    lowest: { date: string; score: number } | null;
    trend: "improving" | "declining" | "stable";
  };
  diary: {
    total: number;
    dates: string[];
    word_count: number;
    excerpts: { date: string; excerpt: string }[];
  };
  challenges: {
    completed: number;
    partial: number;
    missed: number;
    completion_rate: number;
    best_streak: number;
    breakdown: Array<{
      title: string;
      completed: number;
      total_logged_value: number;
      total_target_value: number;
      unit: string | null;
      is_quantifiable: boolean;
    }>;
  };
  chat: {
    sessions: number;
    messages: number;
  };
}

// ──────────────────────────── Date helpers ────────────────────────────

export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.floor((db - da) / 86400000);
}

// ─────────────────────── First-use tracking ───────────────────────

export async function ensureUserAppStart(userId: string): Promise<string> {
  const { data } = await supabase
    .from("user_app_start")
    .select("first_seen_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.first_seen_at) return data.first_seen_at as string;
  const today = todayLocal();
  await supabase.from("user_app_start").insert({ user_id: userId, first_seen_at: today });
  return today;
}

// ─────────────────────── Period calculations ───────────────────────

export interface Period {
  index: number; // 1-based
  start: string;
  end: string;
}

export function calculatePeriods(firstSeenAt: string, type: ReviewType, today: string): Period[] {
  const size = type === "weekly" ? 7 : 28;
  const total = daysBetween(firstSeenAt, today);
  const count = Math.floor((total + 1) / size); // a period is eligible when fully elapsed (end < today)
  // "end before today" means start + size - 1 < today, i.e. start + size <= today in days → count = floor(daysBetween/size). We want end<today strictly.
  // Recompute: a period k (0-indexed) has start=firstSeen+k*size, end=start+size-1. Eligible if end<today → k*size+size-1 < total → k < (total+1-size)/size → k <= floor((total-size+1)/size) ≈ (total-size+1)/size. We use simpler floor approach.
  const periods: Period[] = [];
  for (let k = 0; k < count; k++) {
    const start = addDays(firstSeenAt, k * size);
    const end = addDays(start, size - 1);
    if (daysBetween(end, today) < 1) continue; // require strictly before today
    periods.push({ index: k + 1, start, end });
  }
  return periods;
}

export function nextDueDate(firstSeenAt: string, type: ReviewType, today: string): string {
  const size = type === "weekly" ? 7 : 28;
  const total = daysBetween(firstSeenAt, today);
  const completedCount = Math.max(0, Math.floor(total / size));
  // next review period ends at firstSeen + (completedCount+1)*size - 1; becomes due the next day
  const endOfNext = addDays(firstSeenAt, (completedCount + 1) * size - 1);
  return addDays(endOfNext, 1);
}

// ─────────────────────── Stats snapshot builder ───────────────────────

const SLIDERS = ["happy_sad", "calm_anxious", "confident_insecure", "excited_bored", "rested_tired"] as const;

export async function buildStatsSnapshot(
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<StatsSnapshot> {
  const [moodRes, journalRes, sessionsRes] = await Promise.all([
    supabase
      .from("mood_entries")
      .select("date, happy_sad, calm_anxious, confident_insecure, excited_bored, rested_tired")
      .eq("user_id", userId)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .order("date", { ascending: true }),
    supabase
      .from("journal_entries")
      .select("date, content")
      .eq("user_id", userId)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .order("date", { ascending: true }),
    supabase
      .from("chat_sessions")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${periodStart}T00:00:00Z`)
      .lte("created_at", `${periodEnd}T23:59:59Z`),
  ]);

  // Mood: score is invert of slider avg to align with "higher = better"
  const moodRows = (moodRes.data ?? []) as any[];
  const scored = moodRows.map((m) => {
    const avg = SLIDERS.reduce((s, k) => s + (m[k] ?? 50), 0) / SLIDERS.length;
    return { date: m.date as string, score: Math.round(100 - avg) };
  });
  let avg_score: number | null = null;
  let highest: { date: string; score: number } | null = null;
  let lowest: { date: string; score: number } | null = null;
  let trend: "improving" | "declining" | "stable" = "stable";
  if (scored.length > 0) {
    avg_score = Math.round((scored.reduce((s, x) => s + x.score, 0) / scored.length) * 10) / 10;
    highest = scored.reduce((a, b) => (a.score >= b.score ? a : b));
    lowest = scored.reduce((a, b) => (a.score <= b.score ? a : b));
    if (scored.length >= 4) {
      const mid = Math.floor(scored.length / 2);
      const firstAvg = scored.slice(0, mid).reduce((s, x) => s + x.score, 0) / mid;
      const secondAvg = scored.slice(mid).reduce((s, x) => s + x.score, 0) / (scored.length - mid);
      const diff = secondAvg - firstAvg;
      if (diff > 5) trend = "improving";
      else if (diff < -5) trend = "declining";
    }
  }

  // Diary
  const journalRows = (journalRes.data ?? []) as any[];
  const wordCount = journalRows.reduce((s, j) => s + (j.content ? j.content.trim().split(/\s+/).length : 0), 0);
  const excerpts = journalRows.map((j) => ({
    date: j.date as string,
    excerpt: (j.content ?? "").slice(0, 200),
  }));

  // Challenges removed from app — keep zero stats for backwards compatibility with old reviews UI.
  const completed = 0;
  const partial = 0;
  const missed = 0;
  const completion_rate = 0;
  const best_streak = 0;
  const breakdown: StatsSnapshot["challenges"]["breakdown"] = [];

  // Chat
  const sessionRows = (sessionsRes.data ?? []) as any[];
  let totalMessages = 0;
  if (sessionRows.length > 0) {
    const ids = sessionRows.map((s) => s.id);
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("session_id", ids);
    totalMessages = count ?? 0;
  }

  return {
    mood: { total: scored.length, avg_score, highest, lowest, trend },
    diary: { total: journalRows.length, dates: journalRows.map((j) => j.date), word_count: wordCount, excerpts },
    challenges: { completed, partial, missed, completion_rate, best_streak, breakdown },
    chat: { sessions: sessionRows.length, messages: totalMessages },
  };
}

// ─────────────────────── Prompt builders ───────────────────────

export const WEEKLY_SYSTEM = `Du bist ein warmer, einsichtsvoller mentaler Begleiter, der einen persönlichen Wochenrückblick für eine:n Nutzer:in schreibt. Dein Ton ist ermutigend, ehrlich und mitfühlend. Schreibe in zweiter Person ("du", "dein").

Strukturiere deinen Rückblick in folgende Abschnitte (mit Markdown-Überschriften ##):

1. **Deine Woche auf einen Blick** (2–3 Sätze, die die Gesamtstimmung und Energie der Woche zusammenfassen)
2. **Highlights** (was lief gut – erledigte Challenges, positive Mood-Tage, Journaling-Aktivität)
3. **Schwierigere Momente** (niedrige Mood-Tage oder verpasste Challenges ohne Urteil anerkennen)
4. **Beobachtete Muster** (Trends – z. B. Mood-Tiefs an bestimmten Tagen, Challenge-Serien, mehr Journaling)
5. **Blick nach vorn** (1–2 Sätze sanfter Ermutigung oder ein zarter Vorschlag für die kommende Woche)

Halte den gesamten Rückblick unter 350 Wörtern. Keine klinische Sprache. Keine Diagnosen oder Verschreibungen. Wenn die Daten spärlich sind, konzentriere dich auf das Vorhandene und ermutige zum Weiterführen.`;

export const FOUR_WEEKLY_SYSTEM = `Du bist ein warmer, einsichtsvoller mentaler Begleiter, der einen persönlichen 4-Wochen-Rückblick für eine:n Nutzer:in schreibt. Dein Ton ist reflektiert, ermutigend und mitfühlend. Schreibe in zweiter Person.

Strukturiere deinen Rückblick in folgende Abschnitte (mit Markdown-Überschriften ##):

1. **Deine 4 Wochen auf einen Blick** (3–4 Sätze zum Gesamtverlauf)
2. **Woche für Woche** (ein kurzer Absatz für jede der 4 Wochen, basierend auf den Wochenrückblicken)
3. **Was in diesen 4 Wochen gewachsen ist** (positive Trends, Konsistenzerfolge, bedeutsame Momente)
4. **Was herausfordernd war** (ehrliche, aber freundliche Anerkennung schwerer Phasen)
5. **Muster über die 4 Wochen** (was sich über mehrere Wochen wiederholt)
6. **Eine Intention für die nächsten 4 Wochen** (ein sanfter, konkreter Vorschlag)

Halte den gesamten Rückblick unter 600 Wörtern. Keine klinische Sprache.`;

export function buildWeeklyUserPrompt(stats: StatsSnapshot, period: Period): string {
  const { mood, diary, challenges, chat } = stats;
  const trendDe = mood.trend === "improving" ? "verbessernd" : mood.trend === "declining" ? "abnehmend" : "stabil";
  const best = mood.highest ? `${mood.highest.date} (${mood.highest.score}/100)` : "—";
  const worst = mood.lowest ? `${mood.lowest.date} (${mood.lowest.score}/100)` : "—";
  const breakdown =
    challenges.breakdown.length > 0
      ? challenges.breakdown
          .map((b) => {
            if (!b.is_quantifiable || b.total_target_value === 0) {
              return `${b.title}: ${b.completed} abgeschlossen`;
            }
            const pct = b.total_target_value > 0
              ? Math.round((b.total_logged_value / b.total_target_value) * 100)
              : 0;
            const unit = b.unit ?? "";
            return `${b.title}: ${b.total_logged_value}${unit ? ` ${unit}` : ""} von ${b.total_target_value}${unit ? ` ${unit}` : ""} (${pct}% des Ziels)`;
          })
          .join("; ")
      : "keine";
  const excerpts =
    diary.excerpts.length > 0
      ? diary.excerpts.map((e) => `${e.date}: ${e.excerpt}`).join("\n")
      : "keine Einträge";

  return `Hier sind die Daten für die Woche vom ${period.start} bis ${period.end}:

Mood: ${mood.total} Einträge erfasst. Durchschnitt: ${mood.avg_score ?? "—"}/100. Trend: ${trendDe}. Bester Tag: ${best}. Schwierigster Tag: ${worst}.

Tagebuch: ${diary.total} Einträge (${diary.word_count} Wörter insgesamt).

Challenges: ${challenges.completed} erledigt, ${challenges.partial} teilweise, ${challenges.missed} verpasst (${challenges.completion_rate}% Erledigungsrate). Beste Serie: ${challenges.best_streak} Tage.
Challenge-Übersicht: ${breakdown}

Chat-Sessions: ${chat.sessions} Sessions, ${chat.messages} Nachrichten.

Tagebuch-Auszüge (erste 200 Zeichen jedes Eintrags):
${excerpts}`;
}

export function buildFourWeeklyUserPrompt(
  weeklyReviews: ReviewRow[],
  period: Period,
  periodNumber: number,
): string {
  const sorted = [...weeklyReviews].sort((a, b) => a.period_start.localeCompare(b.period_start));
  const parts = sorted.map((w, i) => {
    const s = w.stats_snapshot;
    const avg = s?.mood.avg_score ?? "—";
    const comp = s?.challenges.completed ?? 0;
    const rate = s?.challenges.completion_rate ?? 0;
    const diary = s?.diary.total ?? 0;
    return `--- Woche ${i + 1}: ${w.period_start} bis ${w.period_end} ---
${w.llm_narrative ?? "(kein Text)"}
Stats: Mood-Ø ${avg}/100, ${comp} Challenges erledigt (${rate}%), ${diary} Tagebucheinträge.`;
  });
  return `Hier ist eine Zusammenfassung der letzten 4 Wochen (Tage ${periodNumber * 28 - 27} bis ${periodNumber * 28} seit App-Start):

${parts.join("\n\n")}`;
}

// ─────────────────────── Generation orchestration ───────────────────────

export async function generateWeeklyReview(userId: string, period: Period): Promise<ReviewRow> {
  // 1. build stats
  const stats = await buildStatsSnapshot(userId, period.start, period.end);

  // 2. upsert row as 'generating'
  const { data: row, error } = await supabase
    .from("reviews")
    .upsert(
      {
        user_id: userId,
        type: "weekly" as const,
        period_start: period.start,
        period_end: period.end,
        stats_snapshot: stats as any,
        status: "generating" as const,
      },
      { onConflict: "user_id,type,period_start" },
    )
    .select()
    .single();
  if (error || !row) throw new Error(error?.message ?? "Konnte Review nicht anlegen");

  // 3. call LLM
  try {
    const userPrompt = buildWeeklyUserPrompt(stats, period);
    const { data: fnData, error: fnErr } = await supabase.functions.invoke("generate-review", {
      body: { type: "weekly", systemPrompt: WEEKLY_SYSTEM, userPrompt },
    });
    if (fnErr) throw new Error(fnErr.message);
    const narrative: string = fnData?.narrative ?? "";
    if (!narrative) throw new Error("Leere Antwort vom Modell");

    const { data: updated } = await supabase
      .from("reviews")
      .update({ llm_narrative: narrative, status: "complete", generated_at: new Date().toISOString() })
      .eq("id", row.id)
      .select()
      .single();
    return (updated ?? row) as unknown as ReviewRow;
  } catch (e) {
    await supabase.from("reviews").update({ status: "error" }).eq("id", row.id);
    throw e;
  }
}

export async function generateFourWeeklyReview(
  userId: string,
  period: Period,
  firstSeenAt: string,
): Promise<ReviewRow> {
  // Fetch (and if missing, generate) the 4 weekly reviews that fall within this 28-day window
  const { data: existing } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "weekly")
    .gte("period_start", period.start)
    .lte("period_end", period.end)
    .order("period_start", { ascending: true });

  const weeklies = (existing ?? []) as unknown as ReviewRow[];

  // Build a lightweight stats snapshot by aggregating weekly stats
  const agg: StatsSnapshot = {
    mood: {
      total: weeklies.reduce((s, w) => s + (w.stats_snapshot?.mood.total ?? 0), 0),
      avg_score: (() => {
        const vals = weeklies.map((w) => w.stats_snapshot?.mood.avg_score).filter((v): v is number => typeof v === "number");
        return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
      })(),
      highest: null,
      lowest: null,
      trend: "stable",
    },
    diary: {
      total: weeklies.reduce((s, w) => s + (w.stats_snapshot?.diary.total ?? 0), 0),
      dates: [],
      word_count: weeklies.reduce((s, w) => s + (w.stats_snapshot?.diary.word_count ?? 0), 0),
      excerpts: [],
    },
    challenges: {
      completed: weeklies.reduce((s, w) => s + (w.stats_snapshot?.challenges.completed ?? 0), 0),
      partial: weeklies.reduce((s, w) => s + (w.stats_snapshot?.challenges.partial ?? 0), 0),
      missed: weeklies.reduce((s, w) => s + (w.stats_snapshot?.challenges.missed ?? 0), 0),
      completion_rate: (() => {
        const rates = weeklies.map((w) => w.stats_snapshot?.challenges.completion_rate).filter((v): v is number => typeof v === "number");
        return rates.length ? Math.round(rates.reduce((s, v) => s + v, 0) / rates.length) : 0;
      })(),
      best_streak: Math.max(0, ...weeklies.map((w) => w.stats_snapshot?.challenges.best_streak ?? 0)),
      breakdown: [],
    },
    chat: {
      sessions: weeklies.reduce((s, w) => s + (w.stats_snapshot?.chat.sessions ?? 0), 0),
      messages: weeklies.reduce((s, w) => s + (w.stats_snapshot?.chat.messages ?? 0), 0),
    },
  };

  const { data: row, error } = await supabase
    .from("reviews")
    .upsert(
      {
        user_id: userId,
        type: "four_weekly" as const,
        period_start: period.start,
        period_end: period.end,
        stats_snapshot: agg as any,
        status: "generating" as const,
      },
      { onConflict: "user_id,type,period_start" },
    )
    .select()
    .single();
  if (error || !row) throw new Error(error?.message ?? "Konnte Review nicht anlegen");

  try {
    // Determine period number (1-based) relative to firstSeenAt
    const periodNumber = Math.floor(daysBetween(firstSeenAt, period.start) / 28) + 1;
    const userPrompt = buildFourWeeklyUserPrompt(weeklies, period, periodNumber);
    const { data: fnData, error: fnErr } = await supabase.functions.invoke("generate-review", {
      body: { type: "four_weekly", systemPrompt: FOUR_WEEKLY_SYSTEM, userPrompt },
    });
    if (fnErr) throw new Error(fnErr.message);
    const narrative: string = fnData?.narrative ?? "";
    if (!narrative) throw new Error("Leere Antwort vom Modell");

    const { data: updated } = await supabase
      .from("reviews")
      .update({ llm_narrative: narrative, status: "complete", generated_at: new Date().toISOString() })
      .eq("id", row.id)
      .select()
      .single();
    return (updated ?? row) as unknown as ReviewRow;
  } catch (e) {
    await supabase.from("reviews").update({ status: "error" }).eq("id", row.id);
    throw e;
  }
}

// ─────────────────────── Load helpers ───────────────────────

export async function listReviews(userId: string, type: ReviewType): Promise<ReviewRow[]> {
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("period_end", { ascending: false });
  return (data ?? []) as unknown as ReviewRow[];
}

export function findMissingPeriods(periods: Period[], existing: ReviewRow[]): Period[] {
  const have = new Set(existing.map((r) => r.period_start));
  return periods.filter((p) => !have.has(p.start));
}
