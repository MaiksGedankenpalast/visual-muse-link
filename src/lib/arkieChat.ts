export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arkie-chat`;

export interface ArkieContextPayload {
  moods?: Array<{ date: string; label: string; score: number; notes?: string }>;
  journals?: Array<{ date: string; excerpt: string }>;
  challenges?: {
    recent: Array<{ date: string; title: string; status: string; notes?: string }>;
    active: string[];
  };
}

export interface ExtraSystemMessage {
  role: "system";
  content: string;
}

export async function sendMessageToArkie(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userName?: string,
  onDelta?: (chunk: string) => void,
  context?: ArkieContextPayload,
  extraSystem?: ExtraSystemMessage | null
): Promise<string> {
  const messages = [
    ...(extraSystem ? [extraSystem] : []),
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages,
      userName,
      moods: context?.moods ?? [],
      journals: context?.journals ?? [],
      challenges: context?.challenges ?? { recent: [], active: [] },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unbekannter Fehler" }));
    throw new Error(err.error || `Fehler ${resp.status}`);
  }

  if (!resp.body) {
    throw new Error("Keine Antwort erhalten");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          fullContent += content;
          onDelta?.(content);
        }
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          fullContent += content;
          onDelta?.(content);
        }
      } catch { /* ignore */ }
    }
  }

  return fullContent;
}
