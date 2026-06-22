import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { awardPoints } from "@/lib/treeProgress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRef } from "react";

const FIXED_CATEGORIES = ["Persönlich", "Arbeit"];

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profileName } = useAuth();
  const name = profileName || t("du");

  const prefillTitle = (location.state as any)?.prefillTitle ?? "";

  const [title, setTitle] = useState(prefillTitle);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Persönlich");
  const [saving, setSaving] = useState(false);
  const [moodAvg, setMoodAvg] = useState<number | null>(null);
  const [moodValues, setMoodValues] = useState<number[] | null>(null);
  const [showPrompt, setShowPrompt] = useState(true);
  const [customCategory, setCustomCategory] = useState<string | null>(null);
  const [showNoTitleDialog, setShowNoTitleDialog] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    setCustomCategory(window.localStorage.getItem(`journal_custom_cat_${user.id}`));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("mood_entries")
      .select("stimmung, energie, stress")
      .eq("user_id", user.id).eq("date", todayStr())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const vals = [data.stimmung, data.energie, data.stress];
          setMoodValues(vals);
          setMoodAvg(vals.reduce((a, b) => a + b, 0) / 3);
        }
      });
  }, [user]);

  const prompt = useMemo(() => {
    if (moodAvg === null) return PROMPTS_NEUTRAL[0];
    // new schema: higher = better
    const pool = moodAvg > 60 ? PROMPTS_POSITIVE : moodAvg < 40 ? PROMPTS_DIFFICULT : PROMPTS_NEUTRAL;
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodAvg !== null]);

  const persistEntry = async (finalTitle: string) => {
    if (!user) return;
    setSaving(true);
    await supabase.from("journal_entries").insert({
      user_id: user.id,
      title: finalTitle,
      content: content.trim() || null,
      category,
      mood_snapshot: moodAvg !== null ? Math.round(moodAvg) : null,
    });
    awardPoints(user.id, 50, "journal");
    toast({ title: t("Gespeichert 💜") });
    setSaving(false);
    navigate("/journal");
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      setShowNoTitleDialog(true);
      return;
    }
    await persistEntry(title.trim());
  };

  const handleSaveWithoutTitle = async () => {
    const dateStr = new Date().toLocaleDateString(i18n.language === "en" ? "en-US" : "de-DE", { day: "numeric", month: "long" });
    setShowNoTitleDialog(false);
    await persistEntry(t("Eintrag vom {{date}}", { date: dateStr }));
  };

  const focusTitle = () => {
    setShowNoTitleDialog(false);
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  return (
    <div
      className="px-4 onboarding-slide min-h-screen"
      style={{
        paddingTop: "24px",
        paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 200px)",
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => {
          if (title.trim() || content.trim()) {
            if (confirm(t("Ungespeicherte Änderungen verwerfen?"))) navigate("/journal");
          } else navigate("/journal");
        }}>
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-lg">{t("Neuer Eintrag")}</h1>
        <span className="w-6" />
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
          <p className="text-[11px] text-foreground/60 uppercase tracking-widest mb-1.5">{t("Arkies Frage für heute")}</p>
          <p className="text-foreground text-[15px] italic text-center">{prompt}</p>
        </div>
      )}

      {/* CATEGORY */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {[...FIXED_CATEGORIES, ...(customCategory ? [customCategory] : [])].map((c) => {
          const active = category === c;
          const isArbeit = c === "Arbeit";
          return (
            <button key={c} onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors"
              style={{
                background: active
                  ? (isArbeit ? "rgba(99,102,241,0.4)" : "var(--mindark-accent-start)")
                  : "rgba(255,255,255,0.08)",
                border: active && isArbeit ? "1px solid rgba(99,102,241,0.5)" : "1px solid transparent",
                color: active ? "white" : "rgba(255,255,255,0.5)",
              }}>
              {t(c)}
            </button>
          );
        })}
      </div>

      {/* TITLE */}
      <input ref={titleInputRef} value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder={t("Titel...")}
        className="w-full text-[22px] font-bold text-foreground placeholder:text-muted-foreground bg-transparent outline-none mb-4" />

      {/* CONTENT */}
      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder={t("Schreib einfach drauf los, {{name}}...", { name })}
        className="w-full min-h-[300px] text-[16px] text-foreground placeholder:text-muted-foreground leading-relaxed resize-none outline-none rounded-[16px] p-4"
        style={{ background: "rgba(255,255,255,0.03)" }} />

      {/* MOOD SNAPSHOT */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-[13px] text-muted-foreground">{t("Mood heute:")}</span>
        {moodValues ? (
          <div className="flex gap-1">
            {moodValues.map((v, i) => (
              <div key={i} className="w-6 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full gradient-primary" style={{ width: `${v}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <button onClick={() => navigate("/moodtracker")}
            className="text-[13px] underline" style={{ color: "var(--mindark-accent-start)" }}>
            {t("Jetzt eintragen")}
          </button>
        )}
      </div>

      {/* FIXED SAVE BUTTON */}
      <div
        className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-4"
        style={{
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px) + 12px)",
          pointerEvents: "none",
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-[52px] rounded-full font-bold text-white uppercase tracking-wide gradient-primary disabled:opacity-60"
          style={{
            boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
            pointerEvents: "auto",
          }}
        >
          {t("Speichern")}
        </button>
      </div>

      {/* NO-TITLE DIALOG */}
      <Dialog open={showNoTitleDialog} onOpenChange={setShowNoTitleDialog}>
        <DialogContent
          className="max-w-[340px] border-0 p-6 rounded-[16px]"
          style={{ background: "rgba(20,15,35,0.98)" }}
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 mb-3"><Arkie size="small" /></div>
            <DialogTitle className="text-white text-[18px] font-bold text-center">
              {t("Ohne Titel speichern?")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[14px] text-center mt-2">
              {t("Kein Problem — Arkie speichert trotzdem alles. 💜")}
            </DialogDescription>
            <div className="w-full mt-5 space-y-2">
              <button
                onClick={handleSaveWithoutTitle}
                className="w-full h-[48px] rounded-full font-bold text-white gradient-primary"
                style={{ boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}
              >
                {t("Ja, speichern")}
              </button>
              <button
                onClick={focusTitle}
                className="w-full h-[48px] rounded-full font-medium text-white bg-transparent"
              >
                {t("Titel hinzufügen")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const hasContentHelper = () => true; // not used

export default JournalNewPage;
