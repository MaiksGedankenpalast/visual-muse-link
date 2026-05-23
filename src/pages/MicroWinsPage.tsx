import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { ArrowLeft, Send, X } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Win {
  id: string;
  content: string;
  date: string;
  created_at: string;
}

const PAGE_SIZE = 20;
const todayStr = () => new Date().toISOString().slice(0, 10);

const MicroWinsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [wins, setWins] = useState<Win[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [showIntro, setShowIntro] = useState(false);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowIntro(!window.localStorage.getItem("microwins_intro_seen"));
  }, []);

  const fetchWins = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("micro_wins")
      .select("id, content, date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setWins(((data ?? []) as Win[]));
  }, [user]);

  useEffect(() => { fetchWins(); }, [fetchWins]);

  const dismissIntro = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("microwins_intro_seen", "1");
    }
    setShowIntro(false);
  };

  const handleSend = async () => {
    const t = text.trim();
    if (!t || !user || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("micro_wins")
      .insert({ user_id: user.id, content: t.slice(0, 120), date: todayStr() });
    setSaving(false);
    if (error) {
      toast.error("Konnte nicht gespeichert werden");
      return;
    }
    setText("");
    setBounce(true);
    setTimeout(() => setBounce(false), 600);
    haptic("selection");
    toast.success("Gespeichert! Arkie ist stolz. ✨");
    fetchWins();
  };

  const since7 = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);
  const winsThisWeek = wins.filter((w) => w.date >= since7);
  const showSummary = winsThisWeek.length >= 7;
  const lastThree = winsThisWeek.slice(0, 3);

  const visible = wins.slice(0, limit);

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/experiment")}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.3)" }}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-[18px]">Micro Wins ✨</h1>
        <div className="w-10" />
      </div>

      {/* INTRO */}
      {showIntro && (
        <div
          className="rounded-[16px] p-4 mb-5 relative flex items-start gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.4), rgba(139,92,246,0.25))",
            border: "1px solid rgba(167,139,250,0.3)",
          }}
        >
          <button
            onClick={dismissIntro}
            className="absolute top-2 right-2 text-foreground/40"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="shrink-0 mt-0.5"><Arkie size="small" /></div>
          <div className="flex-1 pr-4">
            <p className="text-foreground text-[14px] leading-relaxed mb-3">
              Kleine Siege zählen. Was hast du heute geschafft — auch wenn es winzig wirkt?
              Arkie sammelt sie für dich. 💜
            </p>
            <button
              onClick={dismissIntro}
              className="text-[12px] px-3 py-1.5 rounded-full font-medium text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* WEEKLY SUMMARY */}
      {showSummary && (
        <div
          className="rounded-[16px] p-4 mb-5"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(99,102,241,0.3))" }}
        >
          <p className="text-foreground font-bold text-[15px] mb-2">
            Diese Woche: {winsThisWeek.length} kleine Siege 🎉
          </p>
          <div className="space-y-1">
            {lastThree.map((w) => (
              <p key={w.id} className="text-foreground/80 text-[12px] truncate">• {w.content}</p>
            ))}
          </div>
        </div>
      )}

      {/* INPUT */}
      <div className="flex items-start gap-3 mb-5">
        <div className={`shrink-0 mt-1 ${bounce ? "animate-bounce" : ""}`} style={{ width: 40, height: 40 }}>
          <Arkie size="small" />
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground text-[14px] mb-2">Was war dein kleiner Sieg heute?</p>
          <div className="relative">
            <input
              value={text}
              maxLength={120}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Auch Kleinigkeiten zählen..."
              className="w-full pl-4 pr-12 py-3 rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || saving}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{
                background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))",
              }}
              aria-label="Senden"
            >
              <Send className="w-4 h-4 text-foreground" />
            </button>
          </div>
          <p className="text-right text-[10px] text-muted-foreground mt-1">{text.length}/120</p>
        </div>
      </div>

      {/* FEED */}
      <p className="font-bold text-foreground text-[15px] mb-3">Deine bisherigen Siege</p>
      {wins.length === 0 ? (
        <div className="text-center py-10 flex flex-col items-center gap-3">
          <Arkie size="small" />
          <p className="text-muted-foreground text-sm">
            Noch keine Siege eingetragen.<br />Dein erster wartet auf dich. 💜
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((w) => (
            <div
              key={w.id}
              className="rounded-[14px] p-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-muted-foreground text-[11px] mb-1">
                {new Date(w.created_at).toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-foreground text-[14px] leading-snug">{w.content}</p>
            </div>
          ))}
          {wins.length > limit && (
            <button
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              className="w-full py-2.5 text-[13px] text-muted-foreground rounded-full"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              Mehr laden
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MicroWinsPage;