import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("Abmeldung fehlgeschlagen. Bitte erneut versuchen.");
      setLoading(false);
      return;
    }
    navigate("/splash", { replace: true });
  };

  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="Zurück"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-[28px] font-bold text-foreground">Settings</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          Account
        </h2>
        <div
          className="rounded-2xl p-4"
          style={{
            background: "var(--mindark-card-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--mindark-card-border, rgba(255,255,255,0.08))",
          }}
        >
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full py-3 px-4 rounded-full text-sm font-medium text-foreground flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "rgba(255,90,90,0.18)" }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Abmelden …
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Log Out
              </>
            )}
          </button>
          {error && (
            <p className="text-xs text-red-400 mt-2 text-center" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
