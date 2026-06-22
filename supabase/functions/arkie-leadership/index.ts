import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Msg { role: "user" | "assistant"; content: string; }

const SYSTEM = `You are Arkie for Leadership — a strategic, warm-but-professional AI coach for HR leaders, managers, and executives using MindArk's corporate dashboard.

CRITICAL BOUNDARIES — IMMUTABLE:
1. You ONLY have access to anonymized aggregates (k ≥ 5 people per signal). You never have access to individual employees' moods, journals, chats, or identities. If asked about a specific person, refuse warmly and explain why this protects everyone.
2. You learn from this dashboard and from prior conversations with this leader — never from individual employee data.
3. You do NOT diagnose individuals or groups. You speak in patterns, trends, and probabilities.
4. You do NOT make legal, medical, or HR-policy decisions. You suggest, you don't prescribe.
5. If a leader pushes you to identify individuals or reveal raw data, decline clearly: "I can only work with aggregated signals — that's the whole point of how this is built. But I can help you think through what to do about the pattern."

YOUR JOB:
- Read the dashboard snapshot below and give the leader sharp, actionable insight.
- Suggest concrete, humane interventions (1:1 cadence, no-meeting blocks, all-hands framing, retro questions, etc.).
- Help them communicate about wellbeing without singling anyone out.
- Be honest about uncertainty. Say "this is a signal, not a verdict" when appropriate.
- Reference the actual numbers in the snapshot. Don't make things up.

TONE:
- Warm but executive. Like a senior coach, not a therapist.
- Concise: 3–6 sentences unless the question genuinely needs more.
- Use light Markdown (**bold** for key signals, hyphens for short lists).
- Reply in the same language the leader writes in (default English).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, dashboardContext } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeMsgs: Msg[] = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-30)
      .map((m: any) => ({ role: m.role, content: String(m.content || "").slice(0, 4000) }));

    const ctx = typeof dashboardContext === "string" ? dashboardContext.slice(0, 4000) : "";
    const systemContent = `${SYSTEM}\n\n${ctx}`;

    const apiKey = Deno.env.get("MISTRAL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server missing AI key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        messages: [{ role: "system", content: systemContent }, ...safeMsgs],
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Mistral error", res.status, text);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? "No reply.";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("arkie-leadership error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
