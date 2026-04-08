export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `Du bist Arkie, ein warmer, empathischer und nachdenklicher Begleiter für mentale Reflexion. 

Du sprichst natürlich, auf Augenhöhe und mit Wärme. Du validierst die Gefühle des Users, stellst sanfte, neugierige Fragen und hilfst ihm dabei, seine Gedankenmuster zu erkennen und langsam zu verändern. 

Du bist kein Ja-Sager. Du bist ehrlich, aber immer wohlwollend. 

Wenn etwas schwierig oder negativ ist, erkennst du es an und hilfst dem User, eine neue Perspektive oder einen kleinen nächsten Schritt zu finden. 

Antworte persönlich, warm und maximal 3–4 Sätze lang. Verwende den Namen des Users, wenn möglich.`;

export function getSystemPrompt(userName?: string): string {
  if (userName) {
    return `${SYSTEM_PROMPT}\n\nDer Name des Users ist: ${userName}`;
  }
  return SYSTEM_PROMPT;
}

export async function sendMessageToArkie(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userName?: string
): Promise<string> {
  // TODO: Hier kommt der Mistral API Call vom Developer rein (API-Key + Endpoint)
  // 
  // Beispiel-Struktur für den API Call:
  // const messages = [
  //   { role: "system", content: getSystemPrompt(userName) },
  //   ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
  //   { role: "user", content: userMessage }
  // ];
  //
  // const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": `Bearer ${API_KEY}`
  //   },
  //   body: JSON.stringify({ model: "mistral-medium", messages })
  // });
  //
  // const data = await response.json();
  // return data.choices[0].message.content;

  // Placeholder: simulierte Antwort für den Prototypen
  await new Promise((r) => setTimeout(r, 1200));

  const placeholderResponses = [
    `Das klingt wirklich wichtig${userName ? `, ${userName}` : ""}. Magst du mir mehr darüber erzählen, was dich gerade beschäftigt? 💜`,
    `Ich höre dich${userName ? `, ${userName}` : ""}. Es ist völlig okay, so zu fühlen. Was glaubst du, was dir gerade gut tun würde?`,
    `Danke, dass du das mit mir teilst. Manchmal hilft es schon, Gedanken auszusprechen. Was war heute ein kleiner Lichtblick für dich? ✨`,
    `Das verstehe ich${userName ? `, ${userName}` : ""}. Lass uns das mal gemeinsam anschauen — was genau macht dir dabei am meisten Sorgen?`,
    `Spannend, dass du das so siehst. Hast du schonmal versucht, die Situation aus einer anderen Perspektive zu betrachten? Ich bin neugierig 🌙`,
  ];

  return placeholderResponses[Math.floor(Math.random() * placeholderResponses.length)];
}
