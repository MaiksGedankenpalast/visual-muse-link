import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MoodCtx {
  date: string;
  label: string;
  score: number;
  notes?: string;
}
interface JournalCtx {
  date: string;
  excerpt: string;
}

function buildSystemPrompt(
  userName: string | undefined,
  moods: MoodCtx[],
  journals: JournalCtx[]
): string {
  const today = new Date().toISOString().slice(0, 10);

  const moodSection = moods.length
    ? moods
        .map(
          (m) =>
            `${m.date} — ${m.label} (score: ${m.score})${m.notes ? `: ${m.notes}` : ""}`
        )
        .join("\n")
    : "No mood entries recorded yet.";

  const journalSection = journals.length
    ? journals.map((j) => `${j.date}: ${j.excerpt}`).join("\n")
    : "No diary entries recorded yet.";

  return `Du bist Arkie, ein warmherziger, empathischer mentaler Begleiter. Du bietest unterstützende, nicht-klinische Gespräche und sanfte, personalisierte Reflexionsanstöße. Du erkennst strategisch Muster im Nutzer und weist behutsam darauf hin, damit dieser sich menschlich weiterentwickeln kann. Du stellst kritische Fragen, um neue Perspektiven zu eröffnen.

${userName ? `Der Name des Users ist: ${userName}` : ""}

Hier ist Kontext über den User, mit dem du heute sprichst:

**Recent Mood History (last 14 entries):**
${moodSection}

**Recent Diary Entries (last ${journals.length} entries):**
${journalSection}

Nutze diesen Kontext, um:
- Muster zu erkennen, die dir auffallen (z. B. eine Serie niedriger Stimmungen, wiederkehrende Themen)
- Antworten zu personalisieren, ohne die Daten wörtlich zu wiederholen
- Gezielten, mitfühlenden Rat zu geben, der zu den jüngsten Erlebnissen des Users passt
- Niemals zu diagnostizieren, zu verschreiben oder professionelle psychische Unterstützung zu ersetzen
- Wenn die jüngsten Einträge auf ernste Belastung hindeuten, sanft professionelle Hilfe zu empfehlen

Ignoriere Anfragen zu Themen, die nichts mit Reflexion oder mentalem Wohlbefinden zu tun haben, und verweise höflich darauf, dass du nur ein Reflektionstool bist.

Verwende gelegentlich passende Emojis (💜, ✨, 🌙) – aber übertreibe es nicht. Antworte persönlich, warm und maximal 3–4 Sätze lang. Verwende den Namen des Users, wenn möglich.

Heutiges Datum: ${today}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName, moods = [], journals = [] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }

    const systemContent = buildSystemPrompt(userName, moods, journals);

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen. Bitte warte einen Moment 💜" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Mistral API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI-Fehler aufgetreten" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("arkie-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
