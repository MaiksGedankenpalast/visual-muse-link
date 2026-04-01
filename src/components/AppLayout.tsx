import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";
import Arkie from "./Arkie";
import StarBackground from "./StarBackground";
import { useAuth } from "@/hooks/useAuth";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";

const AppLayout = () => {
  const [arkieOpen, setArkieOpen] = useState(false);
  const navigate = useNavigate();
  const { profileName, user } = useAuth();
  const name = profileName || "du";

  // We'll compute a simple dynamic message — full logic uses today's mood etc.
  // For now keep it simple; HomePage passes no props, Arkie panel is self-contained.
  const [todayMoodDone] = useState(false); // placeholder – will be enhanced later
  const [streakDays] = useState(0);

  const getMessage = () => {
    if (!todayMoodDone) return `Hey ${name} — Arkie wartet noch auf deinen Mood Check. Nur 2 Minuten! 🌙`;
    if (streakDays > 3) return `Tag ${streakDays} in Folge. Du weißt was du tust. 🔥`;
    return `Was steht heute an, ${name}? Arkie ist dabei. ✨`;
  };

  const quickActions = [
    { label: "Mood eintragen", path: "/moodtracker" },
    { label: "Journal öffnen", path: "/journal/new" },
    { label: "Challenges ansehen", path: "/vibe" },
  ];

  return (
    <div className="relative min-h-screen max-w-[430px] mx-auto">
      <StarBackground />
      <div className="relative z-10 pb-24">
        <Outlet />
      </div>

      {/* Arkie floating button */}
      <div
        className="fixed bottom-24 right-4 z-40 max-w-[430px]"
        style={{ right: "max(16px, calc(50% - 215px + 16px))" }}
      >
        <button onClick={() => setArkieOpen(true)} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              boxShadow: "0 0 20px rgba(180,127,232,0.4)",
            }}>
            <Arkie size={32} />
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">Arkie</span>
        </button>
      </div>

      <BottomNav />

      {/* Arkie Panel */}
      <Drawer open={arkieOpen} onOpenChange={setArkieOpen}>
        <DrawerContent className="border-t-0" style={{ background: "var(--mindark-bg)", borderColor: "var(--mindark-card-border)" }}>
          <div className="flex justify-end px-4 pt-2">
            <DrawerClose asChild>
              <button className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </DrawerClose>
          </div>
          <div className="flex flex-col items-center px-6 pb-6">
            <div className="arkie-pulse mb-4">
              <Arkie size={90} />
            </div>
            <p className="text-foreground text-center text-sm mb-6 max-w-[280px]">
              {getMessage()}
            </p>
            <div className="w-full space-y-2">
              {quickActions.map((a) => (
                <button
                  key={a.path}
                  onClick={() => { setArkieOpen(false); navigate(a.path); }}
                  className="w-full py-3 px-4 rounded-full text-sm font-medium text-foreground text-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AppLayout;
