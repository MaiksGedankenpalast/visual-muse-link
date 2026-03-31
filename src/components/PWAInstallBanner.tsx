import { useState, useEffect } from "react";
import { X } from "lucide-react";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () => ("standalone" in window.navigator && (window.navigator as any).standalone) || window.matchMedia("(display-mode: standalone)").matches;

const PWAInstallBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("mindark-pwa-dismissed");
    if (!dismissed && isIOS() && !isStandalone()) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-[400px] mx-auto rounded-[16px] p-4 flex items-start gap-3 animate-fade-in"
      style={{ background: "rgba(30,20,50,0.95)", border: "1px solid var(--mindark-card-border)" }}>
      <div className="flex-1">
        <p className="text-foreground text-sm font-medium">Für das beste Erlebnis:</p>
        <p className="text-muted-foreground text-xs mt-1">Teilen → Zum Home-Bildschirm</p>
      </div>
      <button onClick={() => { setShow(false); localStorage.setItem("mindark-pwa-dismissed", "1"); }}>
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
};

export default PWAInstallBanner;
