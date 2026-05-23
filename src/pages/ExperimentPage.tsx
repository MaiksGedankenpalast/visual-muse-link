import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { ChevronRight } from "lucide-react";

const todayStr = () => new Date().toISOString().slice(0, 10);

const ExperimentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedCount, setCompletedCount] = useState(0);
  const [winsWeekCount, setWinsWeekCount] = useState(0);

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
      const since = new Date(); since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().slice(0, 10);
      const { count } = await supabase
        .from("micro_wins")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("date", sinceStr);
      setWinsWeekCount(count ?? 0);
    })();
  }, [user]);

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      <h1 className="font-bold text-foreground text-[24px] mb-1">Experiment</h1>
      <p className="text-muted-foreground text-sm mb-6">Entdecke neue Funktionen</p>

      {/* Today's Vibe */}
      <button
        onClick={() => navigate("/experiment/vibe")}
        className="w-full text-left p-[14px] rounded-[16px] flex items-center justify-between active:scale-[0.98] active:brightness-90 transition-all duration-150 mb-3"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div>
          <div className="text-foreground font-bold text-[15px]">Today's Vibe</div>
          <div className="text-muted-foreground text-[12px] mt-0.5">
            {completedCount} {completedCount === 1 ? "Ding" : "Dinge"} heute erledigt
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
      </button>

      {/* Micro Wins */}
      <button
        onClick={() => navigate("/experiment/microwins")}
        className="w-full text-left p-[14px] rounded-[16px] flex items-center justify-between active:scale-[0.98] active:brightness-90 transition-all duration-150 mb-3"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div>
          <div className="text-foreground font-bold text-[15px]">Micro Wins</div>
          <div className="text-muted-foreground text-[12px] mt-0.5">
            {winsWeekCount} {winsWeekCount === 1 ? "Sieg" : "Siege"} diese Woche
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
      </button>

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