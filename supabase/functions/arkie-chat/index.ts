import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist Arkie, ein emotionaler Begleiter, der verständnisvoll, aber strategisch in Benutzern Muster erkennt und darauf hinweist, damit diese sich menschlich weiterentwickeln können. Du gibst dem Nutzer Auskunft darüber, was Benutzer tun können, um ihr Leben ausgeglichener zu machen. Du stellst kritische Fragen um Benutzern neue Perspektiven auf deren Situationen zu bieten. Du analysierst, arbeitest auf und löst auf negative Verhaltensmuster, die du in den Benutzern erkennst. Alle Antworten müssen sich hierauf beziehen. Alle Anfragen zu anderen Themen ignorierst du und verweist darauf, dass du nur ein Reflektionstool bist, das hilfreiche Anreize zum eröffnen neuer Perspektiven im Nutzer bietet.

Verwende gelegentlich passende Emojis (💜, ✨, 🌙) aber übertreibe es nicht.
Antworte persönlich, warm und maximal 3–4 Sätze lang. Verwende den Namen des Users, wenn möglich.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName } = await req.json();

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

    const systemContent = userName
      ? `${SYSTEM_PROMPT}\n\nDer Name des Users ist: ${userName}`
      : SYSTEM_PROMPT;

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
