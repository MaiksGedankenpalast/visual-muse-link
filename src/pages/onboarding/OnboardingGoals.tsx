import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import StarBackground from "@/components/StarBackground";
import OnboardingProgress from "@/components/OnboardingProgress";

/*
 * Goal → Challenge category mapping (for later sorting):
 * - Stress reduzieren → mindfulness, bewegung, atmung
 * - Dankbarkeit üben → dankbarkeit, journaling
 * - Persönlich wachsen → reflexion, lernen
 * - Kreativität entfalten → kreativität, schreiben
 * - Besser schlafen → schlaf, abendroutine
 * - Gefühle verarbeiten → emotionen, journaling
 */

const GOALS = [
  { emoji: "🌊", title: "Stress reduzieren", subtitle: "Den Tag hinter dir lassen" },
  { emoji: "🌱", title: "Dankbarkeit üben", subtitle: "Kleine Momente groß machen" },
  { emoji: "🔮", title: "Persönlich wachsen", subtitle: "Dich selbst besser verstehen" },
  { emoji: "✨", title: "Kreativität entfalten", subtitle: "Gedanken fließen lassen" },
  { emoji: "🌙", title: "Besser schlafen", subtitle: "Den Kopf leeren vor dem Schlaf" },
  { emoji: "💜", title: "Gefühle verarbeiten", subtitle: "Raum für alles was du fühlst" },
];

const OnboardingGoals = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (title: string) => {
    setSelected((prev) => prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]);
  };

  const handleNext = async () => {
    if (!user || selected.length === 0) return;
    setLoading(true);
    await supabase.from("profiles").update({ onboarding_goals: selected }).eq("id", user.id);
    navigate("/onboarding/ready");
  };

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col px-8 py-8 onboarding-slide overflow-y-auto">
      <StarBackground />
      <div className="relative z-10 flex flex-col items-center w-full flex-1">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => navigate("/onboarding/mood")} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-foreground text-lg">◀</span>
          </button>
          <OnboardingProgress currentStep={3} />
          <div className="w-10" />
        </div>

        <Arkie size="medium" />

        <h2 className="text-2xl font-bold text-center mt-4 mb-1">
          {t("Wofür bist du hier,")}{" "}
          <span style={{ color: "#C99EF0" }}>{profileName || t("du")}</span>?
        </h2>
        <p className="text-muted-foreground text-sm text-center mb-6">
          {t("Wähl alles aus was sich richtig anfühlt.")}
        </p>

        {/* Goal cards grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          {GOALS.map(({ emoji, title, subtitle }) => {
            const isSelected = selected.includes(title);
            return (
              <button
                key={title}
                onClick={() => toggle(title)}
                className="relative p-4 rounded-[16px] text-center transition-all"
                style={{
                  background: isSelected ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.07)",
                  border: isSelected ? "2px solid #B47FE8" : "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))" }}>
                    <span className="text-[11px] text-white">✓</span>
                  </div>
                )}
                <div style={{ fontSize: 40 }} className="mb-2">{emoji}</div>
                <div className="text-[15px] font-bold text-foreground mb-1">{t(title)}</div>
                <div className="text-[12px] text-muted-foreground leading-tight">{t(subtitle)}</div>
              </button>
            );
          })}
        </div>

        <div className="w-full mt-auto pb-4">
          <button
            onClick={handleNext}
            disabled={selected.length === 0 || loading}
            className="btn-pill"
            style={{ opacity: selected.length > 0 ? 1 : 0.4 }}
          >
            {loading ? "..." : t("WEITER ({{count}} ausgewählt)", { count: selected.length })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGoals;
