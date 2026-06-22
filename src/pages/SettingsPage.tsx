import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, LogOut, Camera, Image as ImageIcon, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect } from "react";

type PermState = "granted" | "denied" | "prompt" | "unknown";

async function queryPermission(name: PermissionName): Promise<PermState> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions) return "unknown";
    const r = await navigator.permissions.query({ name } as any);
    return r.state as PermState;
  } catch {
    return "unknown";
  }
}

const SettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<PermState>("unknown");
  const [galleryState, setGalleryState] = useState<PermState>("unknown");
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    queryPermission("camera" as PermissionName).then(setCameraState);
    // Gallery (file picker) hat keine Permissions API → wir nutzen localStorage flag
    if (typeof window !== "undefined" && window.localStorage.getItem("mindark.cameraAsked") === "1") {
      setGalleryState("granted");
    }
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(t("Abmeldung fehlgeschlagen. Bitte erneut versuchen."));
      setLoading(false);
      return;
    }
    navigate("/splash", { replace: true });
  };

  const requestCamera = async () => {
    if (cameraState === "granted") {
      setInfo(t("Kamera-Zugriff ist aktiv. Um ihn zu entziehen, gehe zu deinen Geräte-Einstellungen → MindArk → Kamera ausschalten."));
      return;
    }
    if (cameraState === "denied") {
      setInfo(t("Kamera-Zugriff wurde verweigert. Bitte aktiviere ihn in deinen Geräte-Einstellungen → MindArk → Kamera."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraState("granted");
    } catch {
      setCameraState("denied");
    }
  };

  const subtitleFor = (s: PermState) => {
    if (s === "granted") return { text: t("Zugriff erlaubt ✓"), color: "#4ade80" };
    if (s === "denied") return { text: t("Zugriff verweigert"), color: "#f87171" };
    if (s === "prompt") return { text: t("Noch nicht festgelegt"), color: "rgba(255,255,255,0.5)" };
    return { text: t("Noch nicht festgelegt"), color: "rgba(255,255,255,0.5)" };
  };

  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label={t("Zurück")}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-[28px] font-bold text-foreground">{t("Settings")}</h1>
      </div>

      {/* PRIVACY & PERMISSIONS */}
      <section className="space-y-3 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          {t("Privatsphäre")}
        </h2>
        <div
          className="rounded-2xl overflow-hidden divide-y"
          style={{
            background: "var(--mindark-card-bg, rgba(255,255,255,0.04))",
            border: "1px solid var(--mindark-card-border, rgba(255,255,255,0.08))",
            // @ts-expect-error css var
            "--tw-divide-opacity": 1,
          }}
        >
          <button
            onClick={requestCamera}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            <Camera className="w-5 h-5 text-foreground/80 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{t("Kamera")}</p>
              <p className="text-xs" style={{ color: subtitleFor(cameraState).color }}>
                {subtitleFor(cameraState).text}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
          <button
            onClick={() => setInfo(t("Galerie-Zugriff wird beim Auswählen eines Fotos abgefragt. iOS/Android steuern das systemweit."))}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            <ImageIcon className="w-5 h-5 text-foreground/80 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{t("Galerie-Zugriff")}</p>
              <p className="text-xs" style={{ color: subtitleFor(galleryState).color }}>
                {subtitleFor(galleryState).text}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          {t("Account")}
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
                {t("Abmelden …")}
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                {t("Log Out")}
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

      <AlertDialog open={info !== null} onOpenChange={(o) => !o && setInfo(null)}>
        <AlertDialogContent style={{ background: "#0D0B14", borderColor: "rgba(255,255,255,0.1)" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t("Berechtigung verwalten")}</AlertDialogTitle>
            <AlertDialogDescription>{info}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-foreground">{t("Schließen")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
