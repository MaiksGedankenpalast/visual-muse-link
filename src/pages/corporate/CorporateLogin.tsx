import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PASSWORD = "letmein";

const CorporateLogin = () => {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("dashboardUnlocked") === "1") {
      navigate("/corporate", { replace: true });
    }
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === PASSWORD) {
      localStorage.setItem("dashboardUnlocked", "1");
      navigate("/corporate", { replace: true });
    } else {
      setErr(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0B14] px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 p-8 rounded-2xl border border-white/10 bg-white/[0.04]">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">Corporate Dashboard</h1>
        <p className="text-sm text-muted-foreground">Enter the access password to continue.</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          placeholder="Password"
          className="w-full h-12 rounded-xl bg-white/[0.06] border border-white/10 px-4 text-foreground outline-none focus:border-accent"
        />
        {err && <p className="text-sm text-destructive">Incorrect password.</p>}
        <button type="submit" className="w-full h-12 rounded-xl gradient-primary text-foreground font-semibold">
          Unlock
        </button>
        <button type="button" onClick={() => navigate("/splash")} className="w-full text-xs text-muted-foreground">
          Back
        </button>
      </form>
    </div>
  );
};

export default CorporateLogin;
