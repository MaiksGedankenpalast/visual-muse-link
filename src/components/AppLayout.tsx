import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import Arkie from "./Arkie";
import StarBackground from "./StarBackground";
import ArkieChat from "./ArkieChat";
import { useAuth } from "@/hooks/useAuth";

const AppLayout = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const { profileName } = useAuth();
  const location = useLocation();

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto">
      <StarBackground />
      <div className="relative z-10 pb-24">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </div>

      {/* Arkie floating button */}
      <div
        className="fixed bottom-24 right-4 z-40 max-w-[430px]"
        style={{ right: "max(16px, calc(50% - 215px + 16px))" }}
      >
        <button onClick={() => setChatOpen(true)} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              boxShadow: "0 0 20px rgba(180,127,232,0.4)",
            }}>
            <Arkie size="small" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">Arkie</span>
        </button>
      </div>

      <BottomNav />

      <ArkieChat open={chatOpen} onOpenChange={setChatOpen} userName={profileName || undefined} />
    </div>
  );
};

export default AppLayout;
