import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Arkie from "@/components/Arkie";
import ArkieScene from "@/components/ArkieScene";
import StarBackground from "@/components/StarBackground";
import { seedDevData } from "@/lib/seedDevData";
import { setLang } from "@/i18n";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const Splash = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [devLoading, setDevLoading] = useState(false);
  const [langPicker, setLangPicker] = useState(false);

  // DEV ONLY - REMOVE BEFORE LAUNCH
  const handleDevAccess = async (lang: "de" | "en") => {
    setLang(lang);
    setLangPicker(false);
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
          <span className="sr-only"> — {t("Dein sicherer Raum für Gedanken, Gefühle und Wachstum")}</span>
        </h1>

        <div className="relative w-full mt-8">
          <ArkieScene arkieSize="large" />
        </div>

        <p className="text-center mt-6" style={{ fontSize: 15, opacity: 0.8, maxWidth: 280, lineHeight: 1.6 }}>
          {t("Dein sicherer Raum für Gedanken, Gefühle und Wachstum")}.
        </p>
      </div>

      <div className="relative z-10 w-full space-y-4 mt-8">
        <button onClick={() => { setLang("de"); navigate("/login"); }} className="btn-pill">
          {t("ANMELDEN")}
        </button>
        <button onClick={() => { setLang("de"); navigate("/signup"); }} className="btn-pill" style={{ opacity: 0.85 }}>
          {t("REGISTRIEREN")}
        </button>

        {/* DEV ONLY - REMOVE BEFORE LAUNCH */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setLangPicker(true)}
            disabled={devLoading}
            style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
          >
            {devLoading ? "..." : t("Dev-Zugang")}
          </button>
        </div>
        {/* END DEV ONLY */}
      </div>

      {/* LANGUAGE PICKER for Dev access */}
      <Dialog open={langPicker} onOpenChange={setLangPicker}>
        <DialogContent
          className="max-w-[340px] border-0 p-6 rounded-[16px]"
          style={{ background: "rgba(20,15,35,0.98)" }}
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 mb-3"><Arkie size="small" /></div>
            <DialogTitle className="text-foreground text-[18px] font-bold text-center">
              {t("Sprache wählen")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[14px] text-center mt-2">
              {t("Wähle die Sprache für die Demo-Version.")}
            </DialogDescription>
            <div className="w-full mt-5 space-y-2">
              <button
                onClick={() => handleDevAccess("de")}
                className="w-full h-[48px] rounded-full font-bold text-foreground gradient-primary"
                style={{ boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}
              >
                🇩🇪 Deutsch
              </button>
              <button
                onClick={() => handleDevAccess("en")}
                className="w-full h-[48px] rounded-full font-bold text-foreground gradient-primary"
                style={{ boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => setLangPicker(false)}
                className="w-full h-[44px] rounded-full font-medium text-muted-foreground bg-transparent"
              >
                {t("Abbrechen")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Splash;
