import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import StarBackground from "@/components/StarBackground";
import OnboardingProgress from "@/components/OnboardingProgress";

const OnboardingName = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id);
    navigate("/onboarding/welcome");
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
  };

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col px-8 py-8 onboarding-slide">
      <StarBackground />
      <div className="relative z-10 flex flex-col items-center w-full flex-1">
        <div className="w-full flex items-center justify-between mb-6">
          <button onClick={() => navigate("/splash")} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-foreground text-lg">◀</span>
          </button>
          <OnboardingProgress currentStep={1} />
          <div className="w-10" />
        </div>

        <div className="mt-4 mb-8">
          <Arkie size="large" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">Wie soll ich dich nennen?</h2>
        <p className="text-muted-foreground text-sm text-center mb-8">
          Arkie merkt sich deinen Namen — versprochen.
        </p>

        <input
          type="text"
          placeholder="Dein Name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-14 rounded-[50px] px-6 text-foreground placeholder:text-muted-foreground mb-8"
          style={inputStyle}
          autoFocus
        />

        <div className="w-full mt-auto">
          <button
            onClick={handleNext}
            disabled={!name.trim() || loading}
            className="btn-pill"
            style={{ opacity: name.trim() ? 1 : 0.4 }}
          >
            {loading ? "..." : "WEITER"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingName;
