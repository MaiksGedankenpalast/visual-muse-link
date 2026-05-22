import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { Check, X, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const todayStr = () => new Date().toISOString().slice(0, 10);

interface VibeItem {
  id: string;
  text: string;
  completed: boolean;
}

const ExperimentPage = () => {
  const { user, profileName } = useAuth();
  const name = profileName || "du";

  const [items, setItems] = useState<VibeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("vibe_items")
      .select("id, text, completed")
      .eq("user_id", user.id)
      .eq("date", todayStr())
      .order("created_at", { ascending: true });
    setItems((data as VibeItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newText.trim()) return;
    const text = newText.trim();
    const optimistic: VibeItem = { id: crypto.randomUUID(), text, completed: false };
    setItems((prev) => [...prev, optimistic]);
    setNewText("");
    const { data } = await supabase
      .from("vibe_items")
      .insert({ user_id: user.id, text, date: todayStr() })
      .select("id, text, completed")
      .single();
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === optimistic.id ? (data as VibeItem) : i)));
    }
  };

  const toggle = async (id: string, current: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: !current } : i)));
    await supabase.from("vibe_items").update({ completed: !current }).eq("id", id);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("vibe_items").delete().eq("id", id);
  };

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      <h1 className="font-bold text-foreground text-[24px] mb-1">Experiment 🔮</h1>
      <p className="text-muted-foreground text-sm mb-5">Today's Vibe — was steht heute an, {name}?</p>

      <form onSubmit={addItem} className="flex gap-2 mb-5">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Was möchtest du heute erledigen?"
          className="flex-1 rounded-[14px] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <button
          type="submit"
          disabled={!newText.trim()}
          className="w-11 h-11 rounded-[14px] flex items-center justify-center gradient-primary disabled:opacity-40 shrink-0"
        >
          <Send className="w-5 h-5 text-foreground" />
        </button>
      </form>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-[14px]" />
          <Skeleton className="h-14 rounded-[14px]" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <div className="arkie-float inline-block mb-3"><Arkie size="medium" /></div>
          <p className="text-muted-foreground text-sm">Noch nichts auf der Liste 💜</p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {items.map((item) => (
            <div key={item.id} className="glass-card px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => toggle(item.id, item.completed)}
                className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                style={{
                  borderColor: item.completed ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.2)",
                  background: item.completed ? "var(--mindark-accent-start)" : "transparent",
                }}
              >
                {item.completed && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.text}
              </span>
              <button onClick={() => remove(item.id)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-6 mt-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="text-center py-6">
          <div className="arkie-float inline-block mb-3"><Arkie size="medium" /></div>
          <p className="text-muted-foreground text-sm">Hier entstehen bald weitere Experimente.</p>
        </div>
      </div>
    </div>
  );
};

export default ExperimentPage;