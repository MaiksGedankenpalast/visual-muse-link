import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MoodCtx { date: string; label: string; score: number; notes?: string; }
interface JournalCtx { date: string; excerpt: string; }
interface ChallengeLogCtx {
  date: string; title: string; status: string;
  logged_value?: number | null; target_value?: number | null; unit?: string | null;
}
interface ChatCtx { role: string; content: string; }

interface SmartChallengeResponse {
  challenge_text: string;
  rationale: string;
}

function buildPrompt(
  userName: string | undefined,
  moods: MoodCtx[],
  journals: JournalCtx[],
  challengeLogs: ChallengeLogCtx[],
  chat: ChatCtx[]
): string {
  const moodSection = moods.length
    ? moods.slice(0, 7).map((m) => `${m.date}: ${m.label} (${m.score}/100)`).join("\n")
    : "Keine Mood-Einträge.";
  const journalSection = journals.length
    ? journals.slice(0, 5).map((j) => `${j.date}: ${j.excerpt.slice(0, 200)}`).join("\n")
    : "Keine Journal-Einträge.";
  const challengeSection = challengeLogs.length
    ? challengeLogs.slice(0, 10).map((l) => `${l.date}: ${l.title} (${l.status})`).join("\n")
    : "Keine Challenge-Logs.";
  const chatSection = chat.length
    ? chat.slice(-6).map((m) => `${m.role}: ${m.content.slice(0, 150)}`).join("\n")
    : "Noch kein Chat.";

  return `Du bist Arkie. Generiere EINE sehr kleine, sofort umsetzbare Micro-Challenge (max. 1 Minute bis max. 5 Minuten Aufwand), die genau zur aktuellen Gefühlslage von ${userName ?? "der Person"} passt.

REGELN:
- Sprache: Du-Form, Deutsch, warm, einladend.
- Länge: max. 12 Wörter, ein einziger Satz als Aufforderung.
- Inhalt: konkret & ausführbar (z.B. "Atme 3x tief ein", "Schreib eine Sache auf, die du heute gut gemacht hast").
- KEINE Diagnosen, KEINE medizinischen Tipps.
- Lehnt keine großen Gewohnheiten vor (nicht "mach 30 Minuten Sport").
- Nimm Bezug auf die jüngsten Daten, ohne sie zu zitieren.

KONTEXT:
Moods (neueste zuerst):
${moodSection}

Journal-Auszüge:
${journalSection}

Challenge-Logs:
${challengeSection}

Letzte Chat-Ausschnitte:
${chatSection}

Antworte ausschließlich mit gültigem JSON in genau diesem Format (keine Markdown-Fences, kein Fließtext):
{"challenge_text":"<dein Satz>","rationale":"<1 Satz warum, für internes Logging, nicht für den User sichtbar>"}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { userName, moods = [], journals = [], challengeLogs = [], chat = [] } = await req.json();

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY is not configured");

    const prompt = buildPrompt(userName, moods, journals, challengeLogs, chat);

    const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        messages: [
          { role: "system", content: "Du generierst kompakte Micro-Challenges als striktes JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Mistral error", resp.status, txt);
      return new Response(JSON.stringify({ error: "AI-Fehler" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed: SmartChallengeResponse;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: wrap plain text
      parsed = { challenge_text: content.trim().slice(0, 140) || "Mach 3 ruhige Atemzüge.", rationale: "parse_fallback" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-smart-challenge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});