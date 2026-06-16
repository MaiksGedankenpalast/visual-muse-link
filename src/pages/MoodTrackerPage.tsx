import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { ArrowLeft, ChevronDown, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { awardPoints } from "@/lib/treeProgress";
import { haptic } from "@/lib/haptics";

// ── Slider definitions ──────────────────────────────────────────────
const CORE_SLIDERS = [
  { key: "stimmung", left: "Belastet", right: "Zufrieden" },
  { key: "energie", left: "Erschöpft", right: "Energiegeladen" },
  { key: "stress", left: "Angespannt", right: "Entspannt" },
] as const;

const POS_SLIDERS = [
  { key: "pos_zufriedenheit", label: "Zufriedenheit" },
  { key: "pos_motivation", label: "Motivation" },
  { key: "pos_dankbarkeit", label: "Dankbarkeit" },
  { key: "pos_verbundenheit", label: "Verbundenheit" },
] as const;

const NEG_SLIDERS = [
  { key: "neg_erschoepfung", label: "Erschöpfung" },
  { key: "neg_angst", label: "Angst/Sorge" },
  { key: "neg_traurigkeit", label: "Traurigkeit" },
  { key: "neg_einsamkeit", label: "Einsamkeit" },
] as const;

const SLOT_OPTIONS = ["Fokus", "Körpergefühl", "Kreativität", "Selbstvertrauen", "Freude", "Geduld"];

const TAG_OPTIONS = [
  "Glücklich", "Wütend", "Dankbar", "Verwirrt", "Motiviert",
  "Erschöpft", "Ruhig", "Gestresst", "Ängstlich", "Freudig",
];

const PROMPTS_POSITIVE = [
  "Was hat dich heute wirklich zum Lächeln gebracht?",
  "Worauf bist du gerade stolz, auch wenn es klein erscheint?",
  "Was war der beste Moment des heutigen Tages?",
  "Wem möchtest du heute danken — und warum?",
  "Was hat dir heute Energie gegeben?",
];
const PROMPTS_NEUTRAL = [
  "Was hat dich heute am meisten beschäftigt?",
  "Gibt es etwas, das du gerne loslassen würdest?",
  "Was brauchst du gerade am meisten?",
  "Was würdest du heute anders machen?",
  "Welcher Gedanke geht dir nicht aus dem Kopf?",
];
const PROMPTS_DIFFICULT = [
  "Du musst heute nichts leisten. Was fühlst du gerade wirklich?",
  "Was würdest du einem Freund sagen, dem es so geht wie dir?",
  "Was ist eine kleine Sache, die dir morgen gut tun könnte?",
  "Wann hast du dich zuletzt wirklich gut gefühlt — was war anders?",
  "Was trägst du gerade mit dir, das du noch niemandem gesagt hast?",
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const germanDateFull = () =>
  new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
const timeNow = () =>
  new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

// ── Slider component ─────────────────────────────────────────────────
interface MoodSliderProps {
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
  variant?: "core" | "positive" | "negative";
}
const MoodSlider = ({ value, onChange, left, right, variant = "core" }: MoodSliderProps) => {
  const trackBg =
    variant === "positive" ? "rgba(74,222,128,0.3)"
      : variant === "negative" ? "rgba(239,68,68,0.2)"
      : "rgba(255,255,255,0.12)";
  const fillBg =
    variant === "positive" ? "linear-gradient(90deg, #4ade80, #86efac)"
      : variant === "negative" ? "linear-gradient(90deg, #ef4444, #f87171)"
      : "linear-gradient(90deg, #7B5EA7, #C084FC)";
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] font-bold text-foreground">{left}</span>
        <span className="text-[13px] text-muted-foreground">{right}</span>
      </div>
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[6px] rounded-full"
          style={{ background: trackBg }} />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[6px] rounded-full"
          style={{ width: `${value}%`, background: fillBg }} />
        <input
          type="range" min="0" max="100"
          aria-label={`Skala von ${left} bis ${right}`}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mood-slider relative z-10 w-full"
        />
      </div>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────
const MoodTrackerPage = () => {
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const name = profileName || "du";

  // Kern (Schnell-Check)
  const [stimmung, setStimmung] = useState(50);
  const [energie, setEnergie] = useState(50);
  const [stress, setStress] = useState(50);

  // Tiefen-Check
  const [tiefOpen, setTiefOpen] = useState(false);
  const [posVals, setPosVals] = useState<Record<string, number>>({
    pos_zufriedenheit: 0, pos_motivation: 0, pos_dankbarkeit: 0, pos_verbundenheit: 0,
  });
  const [negVals, setNegVals] = useState<Record<string, number>>({
    neg_erschoepfung: 0, neg_angst: 0, neg_traurigkeit: 0, neg_einsamkeit: 0,
  });

  // Optionale Slots
  const [slot1Name, setSlot1Name] = useState<string | null>(null);
  const [slot1Wert, setSlot1Wert] = useState(50);
  const [slot2Name, setSlot2Name] = useState<string | null>(null);
  const [slot2Wert, setSlot2Wert] = useState(50);
  const [pickerSlot, setPickerSlot] = useState<1 | 2 | null>(null);

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Journal
  const [journalText, setJournalText] = useState("");

  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  // Load saved slot names + count today's entries
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from("profiles").select("opt_slot_1_name, opt_slot_2_name").eq("id", user.id).maybeSingle(),
        supabase.from("mood_entries").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("date", todayStr()),
      ]);
      if (prof?.opt_slot_1_name) setSlot1Name(prof.opt_slot_1_name);
      if (prof?.opt_slot_2_name) setSlot2Name(prof.opt_slot_2_name);
      setTodayCount(count ?? 0);
    })();
  }, [user]);

  const coreAvg = useMemo(() => (stimmung + energie + stress) / 3, [stimmung, energie, stress]);

  // Prompt-Auswahl: höher = besser
  const prompt = useMemo(() => {
    const pool = coreAvg > 60 ? PROMPTS_POSITIVE : coreAvg < 40 ? PROMPTS_DIFFICULT : PROMPTS_NEUTRAL;
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreAvg > 60 ? "pos" : coreAvg < 40 ? "diff" : "neut"]);

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const addCustom = () => {
    if (customTag.trim()) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag("");
      setShowCustom(false);
    }
  };

  const pickSlot = async (slot: 1 | 2, name: string) => {
    if (!user) return;
    if (slot === 1) setSlot1Name(name); else setSlot2Name(name);
    // persist to profile
    await supabase.from("profiles").update(
      slot === 1 ? { opt_slot_1_name: name } : { opt_slot_2_name: name }
    ).eq("id", user.id);
    setPickerSlot(null);
  };

  const removeSlot = async (slot: 1 | 2) => {
    if (!user) return;
    if (slot === 1) setSlot1Name(null); else setSlot2Name(null);
    await supabase.from("profiles").update(
      slot === 1 ? { opt_slot_1_name: null } : { opt_slot_2_name: null }
    ).eq("id", user.id);
  };

  const toggleTief = () => {
    setTiefOpen((v) => !v);
    haptic("selection");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([10, 50, 10]); } catch { /* ignore */ }
    }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      date: todayStr(),
      eingabe_typ: tiefOpen ? "tief" : "schnell",
      stimmung, energie, stress,
      tags: selectedTags.length > 0 ? selectedTags : null,
    };

    if (tiefOpen) {
      for (const s of POS_SLIDERS) {
        const v = posVals[s.key];
        if (v > 0) payload[s.key] = v;
      }
      for (const s of NEG_SLIDERS) {
        const v = negVals[s.key];
        if (v > 0) payload[s.key] = v;
      }
      if (slot1Name) { payload.opt_slot_1_name = slot1Name; payload.opt_slot_1_wert = slot1Wert; }
      if (slot2Name) { payload.opt_slot_2_name = slot2Name; payload.opt_slot_2_wert = slot2Wert; }
    }

    await supabase.from("mood_entries").insert(payload as never);
    awardPoints(user.id, 15, "mood");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mood:saved"));
    }

    if (journalText.trim()) {
      await supabase.from("journal_entries").insert({
        user_id: user.id,
        title: prompt,
        content: journalText.trim(),
        category: "Mood",
        mood_snapshot: Math.round(coreAvg),
      });
      awardPoints(user.id, 50, "journal");
    }

    setShowConfirm(true);
    const toastMsg = coreAvg > 60
      ? `Schön zu hören, ${name}. Bleib so! 💜`
      : coreAvg < 40
        ? `Danke dass du es mit Arkie teilst. Das braucht Mut. 💜`
        : `Danke, ${name}. Arkie ist immer hier. ✨`;
    toast({ title: toastMsg });

    setTimeout(() => {
      setSaving(false);
      navigate("/home");
    }, 1500);
  };

  return (
    <div
      className="px-4 onboarding-slide min-h-screen"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 16px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 128px)",
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate("/home")} aria-label="Zurück">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <p className="text-[13px] text-muted-foreground capitalize">{germanDateFull()}</p>
        <p className="text-[13px] text-muted-foreground">{timeNow()}</p>
      </div>
      {todayCount > 0 && (
        <p className="text-[12px] text-muted-foreground text-center mb-3">
          Eintrag {todayCount + 1} heute
        </p>
      )}

      {/* ARKIE */}
      <div className="flex flex-col items-center mb-6">
        <div className="arkie-float"><Arkie size="medium" /></div>
        <h1 className="text-[22px] font-bold text-foreground text-center mt-4">
          Wie geht's dir gerade, {name}?
        </h1>
        <p className="text-[13px] text-muted-foreground text-center mt-1">
          Sag Arkie wie du dich fühlst — so kurz oder ausführlich wie du möchtest.
        </p>
      </div>

      {/* SCHNELL-CHECK */}
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
        Wie fühlst du dich?
      </p>
      <div className="space-y-5 mb-3">
        <MoodSlider value={stimmung} onChange={setStimmung} left={CORE_SLIDERS[0].left} right={CORE_SLIDERS[0].right} />
        <MoodSlider value={energie} onChange={setEnergie} left={CORE_SLIDERS[1].left} right={CORE_SLIDERS[1].right} />
        <MoodSlider value={stress} onChange={setStress} left={CORE_SLIDERS[2].left} right={CORE_SLIDERS[2].right} />
      </div>

      {/* TOGGLE */}
      <button
        onClick={toggleTief}
        className="flex items-center gap-2 text-[13px] mb-2"
        style={{ color: "#C084FC" }}
      >
        {tiefOpen ? "− Weniger anzeigen" : "+ Mehr erfassen"}
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{ transform: tiefOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* TIEFEN-CHECK */}
      <div
        className="overflow-hidden transition-all duration-[400ms] ease-out"
        style={{ maxHeight: tiefOpen ? 4000 : 0 }}
      >
        <div className="pt-4 space-y-6">
          {/* POSITIVE */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Was spürst du positiv?
            </p>
            <p className="text-[12px] italic text-muted-foreground mb-3">
              Auch wenn es gerade wenig ist — was ist da?
            </p>
            <div className="space-y-4">
              {POS_SLIDERS.map((s) => (
                <MoodSlider
                  key={s.key}
                  value={posVals[s.key]}
                  onChange={(v) => setPosVals((p) => ({ ...p, [s.key]: v }))}
                  left={`${s.label} — Kaum`}
                  right="Sehr"
                  variant="positive"
                />
              ))}
            </div>
          </div>

          {/* NEGATIVE */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Was belastet dich?
            </p>
            <p className="text-[12px] italic text-muted-foreground mb-3">
              Kein Druck — nur wenn du möchtest.
            </p>
            <div className="space-y-4">
              {NEG_SLIDERS.map((s) => (
                <MoodSlider
                  key={s.key}
                  value={negVals[s.key]}
                  onChange={(v) => setNegVals((p) => ({ ...p, [s.key]: v }))}
                  left={`${s.label} — Kaum`}
                  right="Stark"
                  variant="negative"
                />
              ))}
            </div>
          </div>

          {/* SLOTS */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              Eigene Dimensionen
            </p>
            <div className="space-y-3">
              {([1, 2] as const).map((n) => {
                const slotName = n === 1 ? slot1Name : slot2Name;
                const slotVal = n === 1 ? slot1Wert : slot2Wert;
                const setVal = n === 1 ? setSlot1Wert : setSlot2Wert;
                if (!slotName) {
                  return (
                    <button key={n} onClick={() => setPickerSlot(n)}
                      className="w-full p-4 rounded-[16px] text-center text-[13px] text-muted-foreground"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px dashed rgba(255,255,255,0.18)",
                      }}>
                      + Dimension hinzufügen
                    </button>
                  );
                }
                return (
                  <div key={n} className="p-4 rounded-[16px]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-foreground">{slotName}</span>
                      <button onClick={() => removeSlot(n)} aria-label="Entfernen">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <MoodSlider
                      value={slotVal}
                      onChange={setVal}
                      left="Kaum"
                      right="Sehr"
                      variant="core"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TAGS */}
      <div className="mt-6">
        <p className="text-[13px] text-muted-foreground mb-2">Noch etwas hinzufügen?</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {TAG_OPTIONS.map((t) => (
            <button key={t} onClick={() => toggleTag(t)}
              className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors"
              style={{
                background: selectedTags.includes(t) ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)",
                color: selectedTags.includes(t) ? "white" : "rgba(255,255,255,0.5)",
                border: selectedTags.includes(t) ? "none" : "1px solid rgba(255,255,255,0.12)",
              }}>
              {t}
            </button>
          ))}
          {selectedTags.filter((t) => !TAG_OPTIONS.includes(t)).map((t) => (
            <button key={t} onClick={() => toggleTag(t)}
              className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0"
              style={{ background: "var(--mindark-accent-start)", color: "white" }}>
              {t}
            </button>
          ))}
          {showCustom ? (
            <input
              autoFocus value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              onBlur={() => { if (!customTag.trim()) setShowCustom(false); }}
              placeholder="Eigener Tag..."
              className="px-3 py-1.5 rounded-full text-[13px] bg-transparent text-foreground outline-none shrink-0"
              style={{ border: "1px solid rgba(255,255,255,0.2)", width: 120 }}
            />
          ) : (
            <button onClick={() => setShowCustom(true)}
              className="px-3 py-1.5 rounded-full text-[13px] shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
              +
            </button>
          )}
        </div>
      </div>

      {/* PROMPT */}
      <div className="rounded-[20px] p-5 mt-6 mb-4 gradient-primary">
        <p className="text-[11px] text-foreground/60 uppercase tracking-widest mb-2">Arkies Frage für heute</p>
        <p className="text-foreground text-[16px] italic text-center">{prompt}</p>
      </div>

      {/* JOURNAL */}
      <textarea
        value={journalText}
        onChange={(e) => setJournalText(e.target.value)}
        placeholder="Schreib einfach drauf los... (optional)"
        className="w-full min-h-[100px] rounded-[16px] p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />

      {/* SAVE */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-pill mt-6"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Wird gespeichert..." : "FERTIG"}
      </button>

      {/* CONFIRM */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="arkie-pulse">
            <Arkie size="large" />
          </div>
        </div>
      )}

      {/* SLOT PICKER BOTTOM SHEET */}
      {pickerSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setPickerSlot(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full rounded-t-[24px] p-5 pb-8 max-w-[430px] mx-auto"
            style={{ background: "var(--mindark-bg)", borderTop: "1px solid rgba(255,255,255,0.1)" }}
          >
            <p className="text-[15px] font-bold text-foreground mb-3">Eigene Dimension wählen</p>
            <div className="flex flex-wrap gap-2">
              {SLOT_OPTIONS.filter((o) => o !== slot1Name && o !== slot2Name).map((o) => (
                <button key={o} onClick={() => pickSlot(pickerSlot, o)}
                  className="px-4 py-2 rounded-full text-[13px]"
                  style={{ background: "rgba(139,92,246,0.2)", color: "white", border: "1px solid rgba(139,92,246,0.35)" }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodTrackerPage;