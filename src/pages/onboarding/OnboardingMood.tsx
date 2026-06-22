import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import StarBackground from "@/components/StarBackground";
import OnboardingProgress from "@/components/OnboardingProgress";

const SLIDERS = [
  { key: "stimmung", left: "Belastet", right: "Zufrieden" },
  { key: "energie", left: "Erschöpft", right: "Energiegeladen" },
  { key: "stress", left: "Angespannt", right: "Entspannt" },
] as const;

const TAG_OPTIONS = [
  "Glücklich", "Wütend", "Traurig", "Verwirrt", "Dankbar", "Ängstlich", "Erschöpft", "Motiviert",
];

const OnboardingMood = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const [values, setValues] = useState<Record<string, number>>({
    stimmung: 50, energie: 50, stress: 50,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSlider = (key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag("");
      setShowCustom(false);
    }
  };

  const handleNext = async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("mood_entries").insert({
      user_id: user.id,
      date: today,
      eingabe_typ: "schnell",
      stimmung: values.stimmung,
      energie: values.energie,
      stress: values.stress,
      tags: selectedTags.length > 0 ? selectedTags : null,
    });
    navigate("/onboarding/goals");
  };

  const handleSkip = () => navigate("/onboarding/goals");

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col px-8 py-8 onboarding-slide overflow-y-auto">
      <StarBackground />
      <div className="relative z-10 flex flex-col items-center w-full flex-1">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => navigate("/onboarding/welcome")} aria-label={t("Zurück")} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-foreground text-lg">◀</span>
          </button>
          <OnboardingProgress currentStep={2} />
          <button onClick={handleSkip} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            {t("Überspringen")}
          </button>
        </div>

        <Arkie size="medium" />

        <h2 className="text-[22px] font-bold text-center mt-4 mb-1">
          {t("Wie geht's dir heute,")} <span style={{ color: "#C99EF0" }}>{profileName || t("du")}</span>?
        </h2>
        <p className="text-muted-foreground text-[13px] text-center mb-6">
          {t("Schieb die Regler — sag Arkie wie du dich wirklich fühlst.")}
        </p>

        {/* Sliders */}
        <div className="w-full space-y-5 mb-6">
          {SLIDERS.map(({ key, left, right }) => (
            <div key={key} className="w-full">
              <div className="flex justify-between mb-2">
                <span className="text-[13px] font-bold text-foreground">{t(left)}</span>
                <span className="text-[13px] text-muted-foreground">{t(right)}</span>
              </div>
              <div className="relative w-full h-[26px] flex items-center">
                <div className="absolute w-full h-[6px] rounded-[3px]" style={{ background: "rgba(255,255,255,0.15)" }} />
                <div
                  className="absolute h-[6px] rounded-[3px]"
                  style={{
                    width: `${values[key]}%`,
                    background: "linear-gradient(90deg, var(--mindark-accent-start), var(--mindark-accent-end))",
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={values[key]}
                  onChange={(e) => handleSlider(key, Number(e.target.value))}
                  className="mood-slider absolute w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="w-full mb-6">
          <p className="text-[13px] text-muted-foreground mb-3">{t("Noch etwas?")}</p>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-full px-4 py-2 text-[13px] transition-all"
                  style={{
                    background: active ? "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))" : "rgba(255,255,255,0.08)",
                    border: active ? "none" : "1px solid rgba(255,255,255,0.15)",
                    color: active ? "white" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {t(tag)}
                </button>
              );
            })}
            {selectedTags.filter((t) => !TAG_OPTIONS.includes(t)).map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="rounded-full px-4 py-2 text-[13px]"
                style={{
                  background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
                  color: "white",
                }}
              >
                {tag}
              </button>
            ))}
            {showCustom ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                  placeholder={t("Tag...")}
                  className="h-9 rounded-full px-3 text-[13px] text-foreground placeholder:text-muted-foreground"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", width: 100 }}
                  autoFocus
                />
                <button onClick={addCustomTag} className="text-accent text-sm">✓</button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustom(true)}
                className="rounded-full w-9 h-9 flex items-center justify-center text-muted-foreground"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                +
              </button>
            )}
          </div>
        </div>

        <div className="w-full mt-auto pb-4">
          <button onClick={handleNext} className="btn-pill" disabled={loading}>
            {loading ? "..." : t("WEITER")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingMood;
