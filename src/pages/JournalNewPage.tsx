import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["Persönlich", "Work", "Ideen", "Mood", "Dankbarkeit", "Reflexion"];

const PROMPTS_POSITIVE = [
  "Was hat dich heute wirklich zum Lächeln gebracht?",
  "Worauf bist du gerade stolz, auch wenn es klein erscheint?",
  "Was war der beste Moment des heutigen Tages?",
];
const PROMPTS_NEUTRAL = [
  "Was hat dich heute am meisten beschäftigt?",
  "Was brauchst du gerade am meisten?",
  "Welcher Gedanke geht dir nicht aus dem Kopf?",
];
const PROMPTS_DIFFICULT = [
  "Du musst heute nichts leisten. Was fühlst du gerade wirklich?",
  "Was würdest du einem Freund sagen, dem es so geht wie dir?",
  "Was ist eine kleine Sache, die dir morgen gut tun könnte?",
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const JournalNewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profileName } = useAuth();
  const name = profileName || "du";

  const prefillTitle = (location.state as any)?.prefillTitle ?? "";

  const [title, setTitle] = useState(prefillTitle);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Persönlich");
  const [saving, setSaving] = useState(false);
  const [moodAvg, setMoodAvg] = useState<number | null>(null);
  const [moodValues, setMoodValues] = useState<number[] | null>(null);
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("mood_entries")
      .select("happy_sad, calm_anxious, confident_insecure, excited_bored, rested_tired")
      .eq("user_id", user.id).eq("date", todayStr()).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const vals = [data.happy_sad, data.calm_anxious, data.confident_insecure, data.excited_bored, data.rested_tired];
          setMoodValues(vals);
          setMoodAvg(vals.reduce((a, b) => a + b, 0) / 5);
        }
      });
  }, [user]);

  const prompt = useMemo(() => {
    if (moodAvg === null) return PROMPTS_NEUTRAL[0];
    const pool = moodAvg < 40 ? PROMPTS_POSITIVE : moodAvg > 60 ? PROMPTS_DIFFICULT : PROMPTS_NEUTRAL;
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodAvg !== null]);

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    await supabase.from("journal_entries").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim() || null,
      category,
      mood_snapshot: moodAvg !== null ? Math.round(moodAvg) : null,
    });
    toast({ title: "Eintrag gespeichert 💜" });
    setSaving(false);
    navigate("/journal");
  };

  const hasContent = title.trim().length > 0;

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => {
          if (hasContent && content.trim()) {
            if (confirm("Ungespeicherte Änderungen verwerfen?")) navigate("/journal");
          } else navigate("/journal");
        }}>
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-lg">Neuer Eintrag</h1>
        <button onClick={handleSave} disabled={!hasContent || saving}
          className="text-sm font-medium transition-opacity"
          style={{ color: "var(--mindark-accent-start)", opacity: hasContent ? 1 : 0.3 }}>
          Speichern
        </button>
      </div>

      {/* ARKIE + PROMPT */}
      <div className="flex flex-col items-center mb-5">
        <div className="arkie-float"><Arkie size="small" /></div>
      </div>

      {showPrompt && (
        <div className="rounded-[16px] p-4 mb-5 relative gradient-primary">
          <button onClick={() => setShowPrompt(false)} className="absolute top-3 right-3">
            <X className="w-4 h-4 text-foreground/50" />
          </button>
          <p className="text-[11px] text-foreground/60 uppercase tracking-widest mb-1.5">Arkies Frage für heute</p>
          <p className="text-foreground text-[15px] italic text-center">{prompt}</p>
        </div>
      )}

      {/* CATEGORY */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors"
            style={{
              background: category === c ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)",
              color: category === c ? "white" : "rgba(255,255,255,0.5)",
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* TITLE */}
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel..."
        className="w-full text-[22px] font-bold text-foreground placeholder:text-muted-foreground bg-transparent outline-none mb-4" />

      {/* CONTENT */}
      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder={`Schreib einfach drauf los, ${name}...`}
        className="w-full min-h-[300px] text-[16px] text-foreground placeholder:text-muted-foreground leading-relaxed resize-none outline-none rounded-[16px] p-4"
        style={{ background: "rgba(255,255,255,0.03)" }} />

      {/* MOOD SNAPSHOT */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-[13px] text-muted-foreground">Mood heute:</span>
        {moodValues ? (
          <div className="flex gap-1">
            {moodValues.map((v, i) => (
              <div key={i} className="w-6 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full gradient-primary" style={{ width: `${100 - v}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <button onClick={() => navigate("/moodtracker")}
            className="text-[13px] underline" style={{ color: "var(--mindark-accent-start)" }}>
            Jetzt eintragen
          </button>
        )}
      </div>
    </div>
  );
};

export default JournalNewPage;
