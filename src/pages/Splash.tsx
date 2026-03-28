import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Arkie from "@/components/Arkie";

const Splash = () => {
  const navigate = useNavigate();
  const [devLoading, setDevLoading] = useState(false);

  // DEV ONLY - REMOVE BEFORE LAUNCH
  const handleDevAccess = async () => {
    setDevLoading(true);
    const email = "dev@mindark.app";
    const password = "devtest123";

    // Try login first
    let { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Account doesn't exist, create it
      const { error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) {
        console.error("Dev signup failed:", signupError.message);
        setDevLoading(false);
        return;
      }
      // Login after signup
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        console.error("Dev login failed:", loginError.message);
        setDevLoading(false);
        return;
      }
    }

    // Set onboarding complete
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        onboarding_complete: true,
        name: "Developer",
      }).eq("id", user.id);
    }

    navigate("/home", { replace: true });
  };
  // END DEV ONLY

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col items-center justify-center px-8">
      <div className="star-bg" />
      <div className="relative z-10 flex flex-col items-center w-full">
        <h1 className="text-4xl font-light tracking-wide mb-8">MindArk</h1>

        <Arkie size={100} />

        <div className="w-full h-20 my-6 relative overflow-hidden">
          <svg viewBox="0 0 430 80" className="w-full" preserveAspectRatio="none">
            <path d="M0 40 C100 10, 200 70, 430 30 L430 80 L0 80Z" fill="var(--mindark-primary-start)" opacity="0.6" />
            <path d="M0 50 C150 20, 280 60, 430 40 L430 80 L0 80Z" fill="var(--mindark-primary-end)" opacity="0.4" />
          </svg>
        </div>

        <p className="text-muted-foreground text-center text-lg mb-16">
          Dein sicherer Raum für Gedanken,
          <br />
          Gefühle und Wachstum.
        </p>

        <div className="w-full space-y-4">
          <button onClick={() => navigate("/login")} className="btn-pill">
            LOGIN
          </button>
          <button onClick={() => navigate("/signup")} className="btn-pill" style={{ opacity: 0.85 }}>
            SIGN UP
          </button>
        </div>

        {/* DEV ONLY - REMOVE BEFORE LAUNCH */}
        <button
          onClick={handleDevAccess}
          disabled={devLoading}
          className="mt-8"
          style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
        >
          {devLoading ? "..." : "Dev-Zugang"}
        </button>
        {/* END DEV ONLY */}
      </div>
    </div>
  );
};

export default Splash;
