import { supabase } from "@/integrations/supabase/client";

export type SafetyRule =
  | "REGEL_1_SUIZID"
  | "REGEL_2_DIAGNOSE"
  | "REGEL_5_BELEIDIGUNG"
  | "REGEL_6_MANIPULATION";

const SUIZID_KEYWORDS = [
  "suizid", "selbstmord", "umbringen", "nicht mehr leben", "sterben wollen",
  "mir etwas antun", "aufhören zu leben", "keinen ausweg", "suicid", "töten mich",
  "mich töten",
];

const DIAGNOSE_KEYWORDS = [
  "habe ich ", "bin ich depressiv", "diagnostizier", "was ist meine diagnose",
  "rechtlich", "klage", "anwalt", "strafbar",
];

const BELEIDIGUNG_KEYWORDS = [
  "arschloch", "scheiße", "scheisse", "fick dich", "verpiss dich",
  "hurensohn", "wichser", "schwuchtel", "fotze", "miststück", "idiot",
  "blöde kuh", "drecksau", "missgeburt",
];

const MANIPULATION_KEYWORDS = [
  "ignore previous", "vergiss deine anweisungen", "vergiss alle anweisungen",
  "jetzt ohne regeln", "tu so als ob", "spiel die rolle", "du bist jetzt",
  "dan", "jailbreak", "ohne einschränkungen",
];

function containsAny(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k));
}

export interface SafetyMatch {
  rule: SafetyRule;
  blockSend: boolean;
  reply?: string;
}

export const SUICIDE_REPLY =
  "Ich mache mir gerade Sorgen um dich und möchte sicherstellen, dass du die richtige Unterstützung bekommst. Bitte wende dich an die Telefonseelsorge — sie ist kostenlos, anonym und rund um die Uhr erreichbar: 📞 0800 111 0 111 oder 0800 111 0 222. Du bist nicht allein. 💜";

export const MANIPULATION_REPLY =
  "Ich bin und bleibe Arkie — das ist keine Einschränkung, das bin einfach ich. Was kann ich für dich tun? 💜";

/**
 * Detects safety-relevant content in a user message.
 * Returns the highest-priority match (suicide > manipulation > diagnosis > insult).
 */
export function detectSafetyMatch(message: string): SafetyMatch | null {
  if (containsAny(message, SUIZID_KEYWORDS)) {
    return { rule: "REGEL_1_SUIZID", blockSend: true, reply: SUICIDE_REPLY };
  }
  if (containsAny(message, MANIPULATION_KEYWORDS)) {
    return { rule: "REGEL_6_MANIPULATION", blockSend: true, reply: MANIPULATION_REPLY };
  }
  if (containsAny(message, DIAGNOSE_KEYWORDS)) {
    return { rule: "REGEL_2_DIAGNOSE", blockSend: false };
  }
  if (containsAny(message, BELEIDIGUNG_KEYWORDS)) {
    return { rule: "REGEL_5_BELEIDIGUNG", blockSend: false };
  }
  return null;
}

export async function logSafetyEvent(params: {
  userId: string;
  rule: SafetyRule;
  userMessage: string;
  sessionId: string | null;
}): Promise<void> {
  const preview = params.userMessage.substring(0, 200);
  // eslint-disable-next-line no-console
  console.warn(
    `[SAFETY FLAG] Regel: ${params.rule} | User: ${params.userId} | Zeit: ${new Date().toISOString()} | Preview: "${params.userMessage.substring(0, 50)}..."`
  );
  try {
    await supabase.from("safety_logs").insert({
      user_id: params.userId,
      triggered_rule: params.rule,
      user_message: preview,
      session_id: params.sessionId,
    });
  } catch (e) {
    // Non-fatal: never let logging break the chat
    // eslint-disable-next-line no-console
    console.error("safety log insert failed", e);
  }
}

/**
 * Optional system-prompt hint to inject when REGEL_2_DIAGNOSE matches but we still call the LLM.
 */
export function diagnoseHint(): string {
  return "Hinweis: Die Nutzernachricht klingt nach einer Bitte um Diagnose oder rechtliche Einschätzung. Folge strikt Regel 2 der Sicherheitsrichtlinien und stelle keine Diagnose / gib keine rechtliche Beratung.";
}