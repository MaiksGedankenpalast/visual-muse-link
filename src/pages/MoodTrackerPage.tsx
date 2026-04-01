import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SLIDERS = [
  { key: "happy_sad", left: "Glücklich", right: "Traurig" },
  { key: "calm_anxious", left: "Ruhig", right: "Ängstlich" },
  { key: "confident_insecure", left: "Selbstsicher", right: "Unsicher" },
  { key: "excited_bored", left: "Aufgeregt", right: "Gelangweilt" },
  { key: "rested_tired", left: "Ausgeruht", right: "Erschöpft" },
];

const TAG_OPTIONS = [
  "Glücklich", "Wütend", "Traurig", "Verwirrt", "Dankbar",
  "Ängstlich", "Erschöpft", "Motiviert", "Ruhig", "Gestresst",
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
const germanDateFull = () => {
  const d = new Date();
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
};

const MoodTrackerPage = () => {
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const name = profileName || "du";

  const [values, setValues] = useState<Record<string, number>>({
    happy_sad: 50, calm_anxious: 50, confident_insecure: 50, excited_bored: 50, rested_tired: 50,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("mood_entries")
        .select("*").eq("user_id", user.id).eq("date", todayStr()).maybeSingle();
      if (data) {
        setExistingEntry(true);
        setValues({
          happy_sad: data.happy_sad, calm_anxious: data.calm_anxious,
          confident_insecure: data.confident_insecure, excited_bored: data.excited_bored,
          rested_tired: data.rested_tired,
        });
        setSelectedTags((data.tags as string[]) ?? []);
      }
    })();
  }, [user]);

  const avg = useMemo(() => {
    return Object.values(values).reduce((a, b) => a + b, 0) / 5;
  }, [values]);

  const prompt = useMemo(() => {
    const pool = avg < 40 ? PROMPTS_POSITIVE : avg > 60 ? PROMPTS_DIFFICULT : PROMPTS_NEUTRAL;
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avg < 40 ? "pos" : avg > 60 ? "diff" : "neut"]);

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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const moodData = {
      user_id: user.id,
      date: todayStr(),
      ...values,
      tags: selectedTags.length > 0 ? selectedTags : null,
    };

    if (existingEntry) {
      await supabase.from("mood_entries").update(moodData).eq("user_id", user.id).eq("date", todayStr());
    } else {
      await supabase.from("mood_entries").insert(moodData);
    }

    if (journalText.trim()) {
      await supabase.from("journal_entries").insert({
        user_id: user.id,
        title: prompt,
        content: journalText.trim(),
        category: "Mood",
        mood_snapshot: Math.round(avg),
      });
    }

    setShowConfirm(true);

    const toastMsg = avg < 40
      ? `Schön zu hören, ${name}. Bleib so! 💜`
      : avg > 60
        ? `Danke dass du es mit Arkie teilst. Das braucht Mut. 💜`
        : `Danke, ${name}. Arkie ist immer hier. ✨`;

    toast({ title: toastMsg });

    setTimeout(() => {
      setSaving(false);
      navigate("/home");
    }, 1500);
  };

  const showSliders = !existingEntry || editMode;

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate("/home")}>
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <p className="text-sm text-muted-foreground">{germanDateFull()}</p>
        <div className="w-6" />
      </div>

      {existingEntry && !editMode && (
        <button onClick={() => setEditMode(true)}
          className="text-xs text-muted-foreground mb-3 block mx-auto">
          Heute bereits eingetragen — bearbeiten?
        </button>
      )}

      {/* ARKIE */}
      <div className="flex flex-col items-center mb-6">
        <div className="arkie-float">
          <Arkie size="medium" />
        </div>
        <h1 className="text-[22px] font-bold text-foreground text-center mt-4">
          {showSliders
            ? `Wie fühlst du dich gerade, ${name}?`
            : "Dein heutiger Mood"}
        </h1>
        {showSliders && (
          <p className="text-[13px] text-muted-foreground text-center mt-1">
            Schieb die Regler — Arkie hört zu.
          </p>
        )}
      </div>

      {/* CAPSULE VISUALIZATION (read-only) */}
      {existingEntry && !editMode && (
        <div className="flex justify-between gap-2 mb-8 px-2">
          {SLIDERS.map((s) => {
            const val = values[s.key];
            const pct = 100 - val; // invert: low value = positive = high fill
            return (
              <div key={s.key} className="flex flex-col items-center flex-1">
                <div className="relative w-full rounded-full overflow-hidden"
                  style={{ height: 130, background: "rgba(255,255,255,0.08)", borderRadius: 26 }}>
                  <div className="absolute bottom-0 left-0 right-0 gradient-primary flex items-center justify-center"
                    style={{ height: `${pct}%`, borderRadius: "0 0 26px 26px" }}>
                    <span className="text-foreground font-bold text-xs">{pct}%</span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground mt-2 text-center leading-tight">{s.left}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* SLIDERS */}
      {showSliders && (
        <div className="space-y-5 mb-6">
          {SLIDERS.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between mb-1.5">
                <span className="text-[13px] font-bold text-foreground">{s.left}</span>
                <span className="text-[13px] text-muted-foreground">{s.right}</span>
              </div>
              <div className="relative">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[6px] rounded-full"
                  style={{ background: "rgba(255,255,255,0.15)" }} />
                <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[6px] rounded-full gradient-primary"
                  style={{ width: `${values[s.key]}%` }} />
                <input
                  type="range" min="0" max="100"
                  value={values[s.key]}
                  onChange={(e) => setValues((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                  className="mood-slider relative z-10 w-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAGS */}
      <div className="mb-6">
        <p className="text-[13px] text-muted-foreground mb-2">Noch etwas hinzufügen?</p>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((t) => (
            <button key={t} onClick={() => toggleTag(t)}
              className="px-3 py-1.5 rounded-full text-[13px] transition-colors"
              style={{
                background: selectedTags.includes(t) ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)",
                color: selectedTags.includes(t) ? "white" : "rgba(255,255,255,0.5)",
                border: selectedTags.includes(t) ? "none" : "1px solid rgba(255,255,255,0.12)",
              }}>
              {t}
            </button>
          ))}
          {/* custom tags already added */}
          {selectedTags.filter((t) => !TAG_OPTIONS.includes(t)).map((t) => (
            <button key={t} onClick={() => toggleTag(t)}
              className="px-3 py-1.5 rounded-full text-[13px]"
              style={{ background: "var(--mindark-accent-start)", color: "white" }}>
              {t}
            </button>
          ))}
          {showCustom ? (
            <input
              autoFocus
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              onBlur={() => { if (!customTag.trim()) setShowCustom(false); }}
              placeholder="Eigener Tag..."
              className="px-3 py-1.5 rounded-full text-[13px] bg-transparent text-foreground outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.2)", width: 120 }}
            />
          ) : (
            <button onClick={() => setShowCustom(true)}
              className="px-3 py-1.5 rounded-full text-[13px]"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}>
              +
            </button>
          )}
        </div>
      </div>

      {/* ARKIE PROMPT CARD */}
      <div className="rounded-[20px] p-5 mb-6 gradient-primary">
        <p className="text-[11px] text-foreground/60 uppercase tracking-widest mb-2">Arkies Frage für heute</p>
        <p className="text-foreground text-[16px] italic text-center">{prompt}</p>
        <button onClick={() => navigate("/journal/new", { state: { prefillTitle: prompt } })}
          className="text-[13px] text-foreground/70 mt-3 block mx-auto hover:text-foreground transition-colors">
          Im Journal beantworten →
        </button>
      </div>

      {/* JOURNAL QUICK ENTRY */}
      <textarea
        value={journalText}
        onChange={(e) => setJournalText(e.target.value)}
        placeholder="Schreib einfach drauf los... (optional)"
        className="w-full min-h-[100px] rounded-[16px] p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />

      {/* SAVE BUTTON */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-pill mt-6"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Wird gespeichert..." : "FERTIG"}
      </button>

      {/* Arkie confirmation animation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="arkie-pulse">
            <Arkie size={120} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodTrackerPage;
