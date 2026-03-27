import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Auth state change will handle navigation
  };

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto flex flex-col items-center justify-center px-8">
      <div className="star-bg" />
      <div className="relative z-10 w-full">
        <button onClick={() => navigate("/splash")} className="mb-8 w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
          <span className="text-foreground text-lg">◀</span>
        </button>
        <h1 className="text-2xl font-semibold mb-8 text-center">Registrieren</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-14 rounded-[20px] px-5 text-foreground placeholder:text-muted-foreground"
            style={{ background: "var(--mindark-card-bg)", border: "1px solid var(--mindark-card-border)" }}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-14 rounded-[20px] px-5 text-foreground placeholder:text-muted-foreground"
            style={{ background: "var(--mindark-card-bg)", border: "1px solid var(--mindark-card-border)" }}
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" className="btn-pill mt-4" disabled={loading}>
            {loading ? "..." : "SIGN UP"}
          </button>
        </form>
        <p className="text-center text-muted-foreground text-sm mt-6">
          Schon ein Konto?{" "}
          <button onClick={() => navigate("/login")} className="text-accent underline">
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;
