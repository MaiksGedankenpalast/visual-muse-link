/**
 * Arkie Prompt Bank für "Deine Glücksmomente".
 * 30 Prompts in vier Kategorien.
 *
 * TODO PREMIUM: Wenn User in letzten 3 Tagen viele
 * negative Mood-Einträge hatte → bevorzuge Kategorie
 * DANKBARKEIT (Prompts 1-10).
 * Wenn User eine Challenge 7 Tage in Folge gemacht →
 * zeige spezifischen Prompt: "Du machst [Challenge]
 * schon seit einer Woche. Fotografiere wie das
 * deinen Alltag verändert hat."
 * Wenn Arkie-Chat aktiv war → nutze Chat-Themen als
 * Prompt-Inspiration.
 */

export const MOMENT_PROMPTS: string[] = [
  // Dankbarkeit & kleine Freuden (1-10)
  "Fotografiere etwas, das dich heute zum Lächeln gebracht hat — egal wie klein.",
  "Was siehst du gerade in deiner Umgebung, das du normalerweise übersiehst?",
  "Fotografiere etwas, wofür du heute dankbar bist.",
  "Was hat heute deinen Tag ein kleines bisschen besser gemacht?",
  "Fotografiere etwas Schönes das du heute gegessen oder getrunken hast.",
  "Was in deiner Umgebung gibt dir heute Geborgenheit?",
  "Fotografiere einen Moment der Ruhe in deinem Tag.",
  "Was hast du heute Neues entdeckt — auch wenn es winzig klein ist?",
  "Fotografiere etwas das dich an jemanden erinnert den du magst.",
  "Was hat heute gut funktioniert — zeig es Arkie.",
  // Selbstreflexion & Wachstum (11-20)
  "Fotografiere etwas das symbolisiert wie du dich heute fühlst.",
  "Was hast du heute für dich selbst getan — halte es fest.",
  "Fotografiere etwas das dich heute motiviert hat.",
  "Was möchtest du von diesem Tag in Erinnerung behalten?",
  "Zeige Arkie den Ort wo du heute am meisten Zeit verbracht hast.",
  "Fotografiere etwas das dich heute herausgefordert hat — und du es trotzdem gemacht hast.",
  "Was repräsentiert deinen heutigen Energielevel?",
  "Fotografiere etwas das du heute gelernt hast oder lernen wolltest.",
  "Was ist der schönste Moment des heutigen Tages den du nicht vergessen möchtest?",
  "Zeige Arkie etwas das für dich gerade Sicherheit bedeutet.",
  // Natur & Umgebung (21-25)
  "Wie sieht der Himmel bei dir gerade aus?",
  "Fotografiere etwas Natürliches das du heute gesehen hast.",
  "Was siehst du wenn du aus dem Fenster schaust?",
  "Fotografiere das Licht in deiner Umgebung — wie fällt es gerade?",
  "Zeige Arkie deinen Lieblingsort von heute.",
  // Verbindung & Beziehungen (26-30)
  "Fotografiere etwas das du heute mit jemandem geteilt hast.",
  "Was hat dir heute jemand gegeben — auch wenn es nur ein Lächeln war?",
  "Zeige Arkie etwas das dich an Zuhause erinnert.",
  "Fotografiere etwas das du jemandem zeigen möchtest.",
  "Was würdest du heute mit deinem liebsten Menschen teilen wollen?",
];

const STORAGE_KEY = "mindark.momentPrompt.lastIndex";
const STORAGE_DATE = "mindark.momentPrompt.lastDate";

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Liefert den heutigen Prompt. Wird einmal pro Tag stabil gewählt
 * (gleicher Tag → gleicher Prompt). Wechselt täglich und vermeidet
 * den zuletzt verwendeten Index.
 */
export function getDailyMomentPrompt(): string {
  if (typeof window === "undefined") return MOMENT_PROMPTS[0];
  const today = todayStr();
  const lastDate = window.localStorage.getItem(STORAGE_DATE);
  const lastIdxRaw = window.localStorage.getItem(STORAGE_KEY);
  const lastIdx = lastIdxRaw !== null ? Number(lastIdxRaw) : -1;

  if (lastDate === today && lastIdx >= 0 && lastIdx < MOMENT_PROMPTS.length) {
    return MOMENT_PROMPTS[lastIdx];
  }

  let next = Math.floor(Math.random() * MOMENT_PROMPTS.length);
  if (MOMENT_PROMPTS.length > 1) {
    let safety = 0;
    while (next === lastIdx && safety < 5) {
      next = Math.floor(Math.random() * MOMENT_PROMPTS.length);
      safety++;
    }
  }
  window.localStorage.setItem(STORAGE_KEY, String(next));
  window.localStorage.setItem(STORAGE_DATE, today);
  return MOMENT_PROMPTS[next];
}