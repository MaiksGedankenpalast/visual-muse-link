import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { Check, X, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const todayStr = () => new Date().toISOString().slice(0, 10);
const germanDateShort = () =>
  new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long" });

const SUGGESTIONS = [
  "Ausreichend Wasser trinken 💧",
  "10 Minuten frische Luft ☀️",
  "Kurz durchatmen und entspannen 🌿",
  "Jemanden anschreiben dem du dankst 💌",
];

interface VibeItem {
  id: string;
  text: string;
  completed: boolean;
  is_suggestion: boolean;
}

const VibePage = () => {
  const navigate = useNavigate();
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
      .select("id, text, completed, is_suggestion")
      .eq("user_id", user.id)
      .eq("date", todayStr())
      .order("created_at", { ascending: true });

    setItems((data as VibeItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = async (text: string) => {
    if (!user || !text.trim()) return;
    const optimistic: VibeItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      is_suggestion: false,
    };
    setItems((prev) => [...prev, optimistic]);
    setNewText("");

    const { data } = await supabase
      .from("vibe_items")
      .insert({ user_id: user.id, text: text.trim(), date: todayStr() })
      .select("id, text, completed, is_suggestion")
      .single();

    if (data) {
      setItems((prev) =>
        prev.map((i) => (i.id === optimistic.id ? (data as VibeItem) : i))
      );
    }
  };

  const addSuggestion = async (text: string) => {
    if (!user) return;
    const optimistic: VibeItem = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      is_suggestion: true,
    };
    setItems((prev) => [...prev, optimistic]);

    const { data } = await supabase
      .from("vibe_items")
      .insert({ user_id: user.id, text, date: todayStr(), is_suggestion: true })
      .select("id, text, completed, is_suggestion")
      .single();

    if (data) {
      setItems((prev) =>
        prev.map((i) => (i.id === optimistic.id ? (data as VibeItem) : i))
      );
    }
  };

  const toggleComplete = async (id: string, current: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completed: !current } : i))
    );
    await supabase
      .from("vibe_items")
      .update({ completed: !current })
      .eq("id", id);
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("vibe_items").delete().eq("id", id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(newText);
  };

  const open = items.filter((i) => !i.completed);
  const done = items.filter((i) => i.completed);
  const total = items.length;
  const doneCount = done.length;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;

  // Show suggestions only when fewer than 3 items
  const usedTexts = new Set(items.map((i) => i.text));
  const availableSuggestions = SUGGESTIONS.filter((s) => !usedTexts.has(s));
  const showSuggestions = items.length < 3 && availableSuggestions.length > 0;

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="text-center mb-1">
        <div className="flex justify-center gap-1.5 mb-3">
          <div
            className="w-6 h-1.5 rounded-full"
            style={{ background: "var(--mindark-accent-start)" }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{germanDateShort()}</p>
        <h1 className="text-[26px] font-bold text-foreground mt-1">
          Today's Vibe
        </h1>
        <p className="text-[14px] text-muted-foreground">
          {doneCount} von {total} erledigt
        </p>
      </div>

      {/* PROGRESS BAR */}
      <div
        className="w-full h-[6px] rounded-full mt-4 mb-6"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* INPUT */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Was möchtest du heute erledigen?"
          className="flex-1 rounded-[14px] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
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
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-[14px]" />
          <Skeleton className="h-14 rounded-[14px]" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <div className="arkie-float inline-block mb-4">
            <Arkie size="medium" />
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Was steht heute bei dir an, {name}? 💜
          </p>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Arkie schlägt vor:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {availableSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSuggestion(s)}
                    className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Suggestions inline */}
          {showSuggestions && (
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-2">
                Arkie schlägt vor:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSuggestion(s)}
                    className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OPEN */}
          {open.length > 0 && (
            <div className="mb-6">
              <p className="font-bold text-foreground text-[15px] mb-3">
                Noch offen ({open.length})
              </p>
              <div className="space-y-2">
                {open.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card px-4 py-3 flex items-center gap-3"
                  >
                    <button
                      onClick={() => toggleComplete(item.id, false)}
                      className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                      style={{ borderColor: "rgba(255,255,255,0.2)" }}
                    />
                    <span className="text-foreground text-sm flex-1">
                      {item.text}
                    </span>
                    <button onClick={() => removeItem(item.id)}>
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
              <p className="font-bold text-foreground text-[15px] mb-3">
                Erledigt ({done.length})
              </p>
              <div className="space-y-2">
                {done.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card px-4 py-3 flex items-center gap-3"
                  >
                    <button
                      onClick={() => toggleComplete(item.id, true)}
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ background: "var(--mindark-accent-start)" }}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-muted-foreground text-sm flex-1 line-through">
                      {item.text}
                    </span>
                    <button onClick={() => removeItem(item.id)}>
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
