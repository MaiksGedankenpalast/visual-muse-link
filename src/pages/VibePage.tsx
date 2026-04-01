import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { Check, X, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const todayStr = () => new Date().toISOString().slice(0, 10);
const germanDateShort = () => new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long" });

interface ActiveChallenge {
  completion_id: string;
  challenge_id: string;
  completed: boolean;
  title: string;
  icon: string | null;
}

const VibePage = () => {
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const name = profileName || "du";

  const [items, setItems] = useState<ActiveChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("daily_completions")
      .select("id, challenge_id, completed, challenges(title, icon)")
      .eq("user_id", user.id)
      .eq("date", todayStr());

    const mapped: ActiveChallenge[] = (data ?? []).map((d: any) => ({
      completion_id: d.id,
      challenge_id: d.challenge_id,
      completed: d.completed,
      title: d.challenges?.title ?? "Challenge",
      icon: d.challenges?.icon ?? null,
    }));
    setItems(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleComplete = async (id: string, current: boolean) => {
    setItems((prev) => prev.map((i) => i.completion_id === id ? { ...i, completed: !current } : i));
    await supabase.from("daily_completions").update({ completed: !current }).eq("id", id);
  };

  const removeFromToday = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.completion_id !== id));
    await supabase.from("daily_completions").delete().eq("id", id);
  };

  const open = items.filter((i) => !i.completed);
  const done = items.filter((i) => i.completed);
  const total = items.length;
  const doneCount = done.length;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="text-center mb-1">
        <div className="flex justify-center gap-1.5 mb-3">
          <div className="w-6 h-1.5 rounded-full" style={{ background: "var(--mindark-accent-start)" }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
        </div>
        <p className="text-xs text-muted-foreground">{germanDateShort()}</p>
        <h1 className="text-[26px] font-bold text-foreground mt-1">Today's Vibe</h1>
        <p className="text-[14px] text-muted-foreground">{doneCount} von {total} erledigt</p>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full h-[6px] rounded-full mt-4 mb-6" style={{ background: "rgba(255,255,255,0.15)" }}>
        <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* ADD BUTTON */}
      <button onClick={() => navigate("/challenges")}
        className="w-full rounded-[16px] p-4 flex items-center justify-between mb-6 gradient-primary">
        <span className="text-foreground font-medium text-sm">Neue Vibe hinzufügen</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
          <Plus className="w-5 h-5 text-foreground" />
        </div>
      </button>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-[14px]" />
          <Skeleton className="h-14 rounded-[14px]" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="arkie-float inline-block mb-4"><Arkie size="medium" /></div>
          <p className="text-muted-foreground text-sm">
            Noch keine Vibes für heute. Such dir welche aus, {name}! 💜
          </p>
          <button onClick={() => navigate("/challenges")}
            className="mt-4 btn-pill text-sm" style={{ height: 44, width: "auto", padding: "0 28px", display: "inline-flex" }}>
            Challenges entdecken
          </button>
        </div>
      ) : (
        <>
          {/* OPEN */}
          {open.length > 0 && (
            <div className="mb-6">
              <p className="font-bold text-foreground text-[15px] mb-3">Noch offen ({open.length})</p>
              <div className="space-y-2">
                {open.map((ch) => (
                  <div key={ch.completion_id} className="glass-card px-4 py-3 flex items-center gap-3">
                    <button onClick={() => toggleComplete(ch.completion_id, false)}
                      className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                      style={{ borderColor: "rgba(255,255,255,0.2)" }} />
                    <span className="text-foreground text-sm flex-1">{ch.icon} {ch.title}</span>
                    <button onClick={() => removeFromToday(ch.completion_id)}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DONE */}
          {done.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-foreground text-[15px]">Bereits erledigt ({done.length})</p>
              </div>
              <div className="space-y-2">
                {done.map((ch) => (
                  <div key={ch.completion_id} className="glass-card px-4 py-3 flex items-center gap-3">
                    <button onClick={() => toggleComplete(ch.completion_id, true)}
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ background: "var(--mindark-accent-start)" }}>
                      <Check className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-muted-foreground text-sm flex-1 line-through">{ch.icon} {ch.title}</span>
                    <button onClick={() => removeFromToday(ch.completion_id)}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VibePage;
