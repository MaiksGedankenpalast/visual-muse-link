import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Link2,
  Brain,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import Arkie from "@/components/Arkie";
import { supabase } from "@/integrations/supabase/client";

interface MoodEntry {
  date: string;
  happy_sad: number;
  calm_anxious: number;
  confident_insecure: number;
  excited_bored: number;
  rested_tired: number;
  tags: string[] | null;
}

interface Completion {
  date: string;
  completed: boolean;
  challenge_id: string;
  challenges: { category: string | null } | null;
}

interface ChallengeResponse {
  date: string;
  response_text_1: string | null;
  response_text_2: string | null;
  response_text_3: string | null;
}

interface JournalEntry {
  date: string;
  title: string;
  content: string | null;
  mood_snapshot: number | null;
}

interface ChatMsg {
  content: string;
  created_at: string;
}

interface Props {
  moods: MoodEntry[];
  completions: Completion[];
  userId: string | undefined;
}

const moodAvg = (m: MoodEntry) =>
  (m.happy_sad + m.calm_anxious + m.confident_insecure + m.excited_bored + m.rested_tired) / 5;

/** Convert raw 0..100 (lower=better) avg → 0..100 score where higher=better. */
const toScore = (m: MoodEntry) => 100 - moodAvg(m);

// Stop-words to skip when extracting keywords from user text.
const STOPWORDS = new Set([
  "und", "oder", "aber", "der", "die", "das", "ein", "eine", "einen", "einem", "einer",
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mir", "dir", "mich", "dich", "uns", "euch",
  "ist", "war", "sind", "bin", "bist", "hat", "habe", "haben", "hatte", "hatten",
  "mit", "von", "zu", "im", "in", "an", "am", "auf", "für", "fuer", "über", "ueber",
  "den", "dem", "des", "auch", "noch", "nur", "sehr", "mal", "doch", "schon",
  "heute", "gestern", "morgen", "tag", "tage",
  "the", "a", "an", "and", "or", "but", "of", "to", "for",
]);

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS_DE_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}. ${MONTHS_DE_SHORT[d.getMonth()]}.`;
};

function extractKeywords(texts: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  texts.forEach((t) => {
    if (!t) return;
    t.toLowerCase()
      .replace(/[.,!?;:"„"()\[\]]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
  });
  return counts;
}

type InsightCard = {
  id: string;
  tier: "free" | "premium";
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
};

const ArkieInsightsRadar = ({ moods, completions, userId }: Props) => {
  const [responses, setResponses] = useState<ChallengeResponse[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [chats, setChats] = useState<ChatMsg[]>([]);
  // Prototype: premium features are unlocked but visually badged.
  const isPremium = true;

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const [{ data: resp }, { data: jrn }, { data: chat }] = await Promise.all([
        supabase
          .from("challenge_responses")
          .select("date,response_text_1,response_text_2,response_text_3")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(60),
        supabase
          .from("journal_entries")
          .select("date,title,content,mood_snapshot")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(60),
        supabase
          .from("chat_messages")
          .select("content,created_at")
          .eq("user_id", userId)
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      setResponses((resp ?? []) as ChallengeResponse[]);
      setJournals((jrn ?? []) as JournalEntry[]);
      setChats((chat ?? []) as ChatMsg[]);
    })();
  }, [userId]);

  // ── Freemium correlation: per category ── 
  const correlations = useMemo(() => {
    if (moods.length < 3) return [];
    const moodMap = new Map(moods.map((m) => [m.date, toScore(m)]));
    const overallAvg =
      [...moodMap.values()].reduce((a, b) => a + b, 0) / moodMap.size;

    const catDays: Record<string, Set<string>> = {};
    completions
      .filter((c) => c.completed && c.challenges?.category)
      .forEach((c) => {
        const cat = c.challenges!.category!;
        if (!catDays[cat]) catDays[cat] = new Set();
        catDays[cat].add(c.date);
      });

    const out: { category: string; deltaPct: number }[] = [];
    for (const [cat, dates] of Object.entries(catDays)) {
      if (dates.size < 3) continue; // ≥ 3 days requirement
      const scores = [...dates].map((d) => moodMap.get(d)).filter((v): v is number => v !== undefined);
      if (scores.length < 3) continue;
      const catAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (catAvg <= overallAvg) continue; // only positive correlations
      const deltaPct = Math.round(((catAvg - overallAvg) / Math.max(1, overallAvg)) * 100);
      if (deltaPct >= 5) {
        out.push({ category: cat, deltaPct });
      }
    }
    return out.sort((a, b) => b.deltaPct - a.deltaPct).slice(0, 3);
  }, [moods, completions]);

  // ── Premium-style preview: keyword × mood (always computed, gated visually) ──
  const keywordInsight = useMemo(() => {
    if (responses.length < 3 || moods.length < 3) return null;
    const moodMap = new Map(moods.map((m) => [m.date, m.confident_insecure]));
    // Lower confident_insecure = more confident
    const byKeyword: Record<string, { withScores: number[]; withoutScores: number[] }> = {};

    const allKeywords = new Set<string>();
    responses.forEach((r) => {
      const kws = extractKeywords([r.response_text_1 ?? "", r.response_text_2 ?? "", r.response_text_3 ?? ""]);
      kws.forEach((_, k) => allKeywords.add(k));
    });

    allKeywords.forEach((kw) => {
      byKeyword[kw] = { withScores: [], withoutScores: [] };
      responses.forEach((r) => {
        const score = moodMap.get(r.date);
        if (score === undefined) return;
        const text = `${r.response_text_1 ?? ""} ${r.response_text_2 ?? ""} ${r.response_text_3 ?? ""}`.toLowerCase();
        if (text.includes(kw)) byKeyword[kw].withScores.push(score);
        else byKeyword[kw].withoutScores.push(score);
      });
    });

    let best: { keyword: string; delta: number } | null = null;
    for (const [kw, { withScores, withoutScores }] of Object.entries(byKeyword)) {
      if (withScores.length < 2 || withoutScores.length < 2) continue;
      const a = withScores.reduce((s, v) => s + v, 0) / withScores.length;
      const b = withoutScores.reduce((s, v) => s + v, 0) / withoutScores.length;
      // Better = lower confident_insecure → invert
      const delta = b - a;
      if (delta > 8 && (!best || delta > best.delta)) {
        best = { keyword: kw, delta };
      }
    }
    return best;
  }, [responses, moods]);

  return (
    <div
      className="mb-4"
      style={{
        background: "rgba(139,92,246,0.1)",
        border: "1px solid rgba(139,92,246,0.3)",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 0 15px rgba(139,92,246,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="shrink-0">
          <Arkie size="small" />
        </div>
        <p
          className="text-[12px] font-semibold uppercase"
          style={{ color: "rgba(255,255,255,0.55)", letterSpacing: "0.12em" }}
        >
          Arkies Erkenntnisse
        </p>
      </div>

      {/* Body — Freemium correlations */}
      <div className="space-y-2">
        {correlations.length === 0 ? (
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Arkie sammelt noch Daten. Bei mindestens 3 abgeschlossenen Challenges einer
            Kategorie zeige ich dir hier deine persönlichen Muster. ✨
          </p>
        ) : (
          correlations.map((c) => {
            const label = c.category.charAt(0).toUpperCase() + c.category.slice(1);
            return (
              <div
                key={c.category}
                className="flex items-start gap-2 rounded-[14px] p-3"
                style={{ background: "rgba(139,92,246,0.12)" }}
              >
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#c4b5fd" }} />
                <p className="text-foreground text-[13px] leading-relaxed">
                  <span className="font-semibold">{label}</span>-Challenges korrelieren bei
                  dir mit <span className="font-bold" style={{ color: "#c4b5fd" }}>{c.deltaPct}%</span>{" "}
                  besserer Laune! ✨
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Premium deep-dive */}
      <div
        className="mt-4 pt-4 relative"
        style={{ borderTop: "1px dashed rgba(139,92,246,0.25)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}
          >
            Arkies Deep-Dive · Premium
          </p>
        </div>
        <div className={isPremium ? "" : "select-none"} style={{ filter: isPremium ? "none" : "blur(3px)" }}>
          {keywordInsight ? (
            <p className="text-foreground text-[13px] leading-relaxed">
              Deine Einträge zu <span className="font-semibold">„{keywordInsight.keyword}"</span> gehen
              an Tagen mit höherem <span className="font-semibold">Selbstsicher</span>-Wert
              einher.
            </p>
          ) : (
            <p className="text-foreground text-[13px] leading-relaxed">
              Schreibe in deinen Dankbarkeits- &amp; Reflexions-Challenges, um Muster zwischen
              Themen und Stimmung zu entdecken.
            </p>
          )}
        </div>
        {!isPremium && (
          <button
            type="button"
            onClick={() => {
              /* Future: open paywall. Kept as a no-op to avoid scope creep. */
            }}
            className="mt-3 w-full text-[12px] font-medium py-2 rounded-[12px] transition-opacity hover:opacity-90"
            style={{
              background: "rgba(139,92,246,0.25)",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "white",
            }}
          >
            🔮 Mit Premium freischalten
          </button>
        )}
      </div>
    </div>
  );
};

export default ArkieInsightsRadar;
