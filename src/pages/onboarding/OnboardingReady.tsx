import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seedPitchData } from "@/lib/seedPitchData";
import Arkie from "@/components/Arkie";
import StarBackground from "@/components/StarBackground";
import OnboardingProgress from "@/components/OnboardingProgress";

const OnboardingReady = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!user) return;
    setLoading(true);
    const isPitch = localStorage.getItem("mindark_pitch_mode") === "true";
    if (isPitch) {
      await seedPitchData(user.id);
      localStorage.removeItem("mindark_pitch_mode");
    } else {
      await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", user.id);
    }
    navigate("/home", { replace: true });
  };

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col items-center justify-center px-8 py-8 onboarding-slide">
      <StarBackground />
      <div className="relative z-10 flex flex-col items-center w-full">
        <OnboardingProgress currentStep={4} />

        <div className="mt-12 mb-8 arkie-pulse">
          <Arkie size="large" />
        </div>

        <h2 className="text-[26px] font-bold text-center mb-3">
          {t("Arkie ist bereit,")} <span style={{ color: "#C99EF0" }}>{profileName || t("du")}</span>.
        </h2>

        <p className="text-muted-foreground text-[15px] text-center mb-3">
          {t("Dein Raum wartet. Lass uns anfangen.")}
        </p>

        <p className="text-center mb-12" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {t("Du kannst jederzeit alles ändern.")}
        </p>

        <button onClick={handleStart} className="btn-pill w-full" disabled={loading}>
          {loading ? "..." : t("LOS GEHT'S 💜")}
        </button>
      </div>
    </div>
  );
};

export default OnboardingReady;
