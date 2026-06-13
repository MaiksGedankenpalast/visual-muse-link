import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Arkie from "@/components/Arkie";
import ArkieScene from "@/components/ArkieScene";
import StarBackground from "@/components/StarBackground";
import { seedDevData } from "@/lib/seedDevData";

const Splash = () => {
  const navigate = useNavigate();
  const [devLoading, setDevLoading] = useState(false);

  // DEV ONLY - REMOVE BEFORE LAUNCH
  const handleDevAccess = async () => {
    setDevLoading(true);
    const email = "dev@mindark.app";
    const password = "devtest123";
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const { error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) { console.error("Dev signup failed:", signupError.message); setDevLoading(false); return; }
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) { console.error("Dev login failed:", loginError.message); setDevLoading(false); return; }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await seedDevData(user.id);
    }
    navigate("/home", { replace: true });
  };
  // END DEV ONLY

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col items-center justify-between px-8 py-12 overflow-hidden">
      <StarBackground />

      <div className="relative z-10 flex flex-col items-center w-full flex-1">
        <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: 4, marginTop: 40 }} className="text-foreground">
          MindArk
          <span className="sr-only"> — Dein sicherer Raum für Gedanken, Gefühle und Wachstum</span>
        </h1>

        <div className="relative w-full mt-8">
          <ArkieScene arkieSize="large" />
        </div>

        <p className="text-center mt-6" style={{ fontSize: 15, opacity: 0.8, maxWidth: 280, lineHeight: 1.6 }}>
          Dein sicherer Raum für Gedanken,
          <br />
          Gefühle und Wachstum.
        </p>
      </div>

      <div className="relative z-10 w-full space-y-4 mt-8">
        <button onClick={() => navigate("/login")} className="btn-pill">
          ANMELDEN
        </button>
        <button onClick={() => navigate("/signup")} className="btn-pill" style={{ opacity: 0.85 }}>
          REGISTRIEREN
        </button>

        {/* DEV ONLY - REMOVE BEFORE LAUNCH */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleDevAccess}
            disabled={devLoading}
            style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
          >
            {devLoading ? "..." : "Dev-Zugang"}
          </button>
        </div>
        {/* END DEV ONLY */}
      </div>
    </div>
  );
};

export default Splash;
