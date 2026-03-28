import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";

const Signup = () => {
  const navigate = useNavigate();
  const { user, onboardingComplete } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (onboardingComplete) {
        navigate("/home", { replace: true });
      } else {
        navigate("/onboarding/name", { replace: true });
      }
    }
  }, [user, onboardingComplete, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
  };

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col px-8 py-8 overflow-y-auto">
      <div className="star-bg" />
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Back button */}
        <div className="w-full">
          <button onClick={() => navigate("/splash")} className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-foreground text-lg">◀</span>
          </button>
        </div>

        {/* Arkie */}
        <div className="mt-8 mb-10">
          <Arkie size={90} />
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4 w-full">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-14 rounded-[50px] px-6 text-foreground placeholder:text-muted-foreground"
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-14 rounded-[50px] px-6 text-foreground placeholder:text-muted-foreground"
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Passwort wiederholen"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full h-14 rounded-[50px] px-6 text-foreground placeholder:text-muted-foreground"
            style={inputStyle}
            required
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" className="btn-pill mt-6" disabled={loading}>
            {loading ? "..." : "WEITER"}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Schon ein Konto?{" "}
          <button onClick={() => navigate("/login")} className="text-accent underline">
            Anmelden
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
