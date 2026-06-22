import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { Check, X, Send, ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const todayStr = () => new Date().toISOString().slice(0, 10);
const todayLabel = () =>
  new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

interface VibeItem {
  id: string;
  text: string;
  completed: boolean;
}

const SUGGESTIONS = [
  "5 Minuten an die frische Luft",
  "Ein Glas Wasser trinken",
  "Jemandem eine liebe Nachricht schicken",
  "Kurze Dehnübung",
  "Aufräumen für 10 Minuten",
];

const VibePage = () => {
  const { t } = useTranslation();
  const { user, profileName } = useAuth();
  const navigate = useNavigate();
  const name = profileName || t("du");

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

  const addItem = async (textRaw: string) => {
    if (!user || !textRaw.trim()) return;
    const text = textRaw.trim();
    const optimistic: VibeItem = { id: crypto.randomUUID(), text, completed: false };
    setItems((prev) => [...prev, optimistic]);
    const { data } = await supabase
      .from("vibe_items")
      .insert({ user_id: user.id, text, date: todayStr() })
      .select("id, text, completed")
      .single();
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === optimistic.id ? (data as VibeItem) : i)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newText;
    setNewText("");
    await addItem(t);
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
    <div className="px-4 pt-4 pb-32 onboarding-slide min-h-screen">
      <div className="relative flex items-center justify-center mb-2">
        <button
          onClick={() => navigate("/experiment")}
          className="absolute left-0 w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label={t("Zurück")}
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-[18px]">{t("Today's Vibe")}</h1>
      </div>
      <p className="text-center text-muted-foreground text-xs mb-5">{todayLabel()}</p>

      <div className="flex items-center gap-3 mb-4">
        <div className="arkie-float shrink-0"><Arkie size="small" /></div>
        <p className="text-sm text-foreground">{t("Was steht heute an, {{name}}? 💜", { name })}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-5">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t("Was möchtest du heute erledigen?")}
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
        <div>
          <p className="text-muted-foreground text-xs mb-3 px-1">{t("Arkies Vorschläge:")}</p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => addItem(s)}
                className="w-full text-left glass-card px-4 py-3 text-sm text-foreground hover:brightness-110 transition"
              >
                + {t(s)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
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
    </div>
  );
};

export default VibePage;
