import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

const todayStr = () => new Date().toISOString().slice(0, 10);

const ComingSoonCard = ({ emoji, title }: { emoji: string; title: string }) => (
  <button
    onClick={() => toast("Kommt bald! Arkie arbeitet daran. 🔮")}
    className="relative text-left p-4 rounded-[20px] opacity-50 active:scale-[0.98] transition"
    style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
    }}
  >
    <span
      className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full text-muted-foreground"
      style={{ background: "rgba(255,255,255,0.08)" }}
    >
      Bald
    </span>
    <div className="text-[28px] mb-2">{emoji}</div>
    <div className="text-foreground font-semibold text-sm">{title}</div>
  </button>
);

const ExperimentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("vibe_items")
        .select("completed")
        .eq("user_id", user.id)
        .eq("date", todayStr())
        .eq("completed", true);
      setCompletedCount(data?.length ?? 0);
    })();
  }, [user]);

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      <h1 className="font-bold text-foreground text-[24px] mb-1">Experiment 🧪</h1>
      <p className="text-muted-foreground text-sm mb-6">Entdecke neue Funktionen</p>

      {/* Today's Vibe — full width */}
      <button
        onClick={() => navigate("/experiment/vibe")}
        className="w-full text-left p-[18px] rounded-[20px] flex items-center gap-4 active:scale-[0.98] active:brightness-90 transition-all duration-150 mb-3"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="text-[40px] leading-none shrink-0">✅</div>
        <div className="flex-1 min-w-0">
          <div className="text-foreground font-bold text-[16px]">Today's Vibe</div>
          <div className="text-muted-foreground text-[13px]">Deine tägliche To-Do Liste</div>
          <div className="text-[12px] mt-1" style={{ color: "var(--mindark-accent-start)" }}>
            {completedCount} {completedCount === 1 ? "Ding" : "Dinge"} heute erledigt
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-foreground/60 shrink-0" />
      </button>

      {/* Coming soon grid */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <ComingSoonCard emoji="🎯" title="Gewohnheiten" />
        <ComingSoonCard emoji="📊" title="Wochenreview" />
        <ComingSoonCard emoji="🌬️" title="Atemübungen" />
      </div>

      {/* Arkie hint */}
      <div className="flex flex-col items-center text-center mt-10 px-6">
        <div className="arkie-float mb-3" style={{ width: 50, height: 50 }}>
          <Arkie size="small" />
        </div>
        <p className="text-muted-foreground text-sm">
          Arkie testet hier neue Ideen mit dir. Was hilft dir wirklich?
        </p>
      </div>
    </div>
  );
};

export default ExperimentPage;
