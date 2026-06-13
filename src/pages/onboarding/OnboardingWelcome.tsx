import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import StarBackground from "@/components/StarBackground";
import OnboardingProgress from "@/components/OnboardingProgress";

const OnboardingWelcome = () => {
  const navigate = useNavigate();
  const { profileName } = useAuth();

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col px-8 py-8 onboarding-slide">
      <StarBackground />
      <div className="relative z-10 flex flex-col items-center w-full flex-1">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => navigate("/onboarding/name")} aria-label="Zurück" className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-foreground text-lg">◀</span>
          </button>
          <OnboardingProgress currentStep={1} />
          <div className="w-10" />
        </div>

        <div className="mt-6 mb-8 arkie-pulse">
          <Arkie size="large" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-4">
          Schön, dich kennenzulernen,{" "}
          <span style={{ color: "#C99EF0" }}>{profileName || "du"}</span>!
        </h2>

        <p className="text-center text-foreground mb-3" style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.9 }}>
          Ich bin Arkie — und ich bin hier um zuzuhören, mitzufühlen, und dabei zu sein wenn du schreibst.
        </p>

        <p className="text-muted-foreground text-center text-sm" style={{ opacity: 0.6 }}>
          Dein persönlicher Begleiter. Immer da.
        </p>

        <div className="w-full mt-auto">
          <button onClick={() => navigate("/onboarding/mood")} className="btn-pill">
            LOS GEHT'S
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcome;
