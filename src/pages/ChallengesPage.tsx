import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from "@/components/ui/drawer";
import SmartChallengeWidget from "@/components/SmartChallengeWidget";

/* ── goal → category mapping ── */
const GOAL_CATEGORIES: Record<string, string[]> = {
  "Stress reduzieren": ["mindfulness", "bewegung", "atmung"],
  "Dankbarkeit üben": ["dankbarkeit", "journaling"],
  "Persönlich wachsen": ["reflexion", "lernen"],
  "Kreativität entfalten": ["kreativität", "schreiben"],
  "Besser schlafen": ["schlaf", "abendroutine"],
  "Gefühle verarbeiten": ["emotionen", "journaling"],
};

const CATEGORIES = ["Alle", "Bewegung", "Ernährung", "Mindfulness", "Schlaf", "Kreativität", "Dankbarkeit", "Reflexion"];
const EMOJI_OPTIONS = ["⭐", "💪", "🧠", "❤️", "🔥", "🌱", "🎯", "🚀", "✨", "🏆", "🌿", "📚"];

const todayStr = () => new Date().toISOString().slice(0, 10);

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  is_preset: boolean;
}

const ChallengesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [todayIds, setTodayIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const initialFilter = (() => {
    const k = searchParams.get("kategorie");
    if (!k) return "Alle";
    const match = CATEGORIES.find((c) => c.toLowerCase() === k.toLowerCase());
    return match ?? "Alle";
  })();
  const [filter, setFilter] = useState(initialFilter);
  const [goals, setGoals] = useState<string[]>([]);

  // create challenge state
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmoji, setNewEmoji] = useState("⭐");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("mindfulness");

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: chData }, { data: ucData }, { data: profile }] = await Promise.all([
      supabase.from("challenges").select("*").or(`is_preset.eq.true,user_id.eq.${user.id}`),
      supabase.from("user_challenges").select("challenge_id").eq("user_id", user.id).eq("is_active", true),
      supabase.from("profiles").select("onboarding_goals").eq("id", user.id).single(),
    ]);
    setChallenges((chData ?? []) as Challenge[]);
    setTodayIds(new Set((ucData ?? []).map((c: any) => c.challenge_id)));
    setGoals((profile?.onboarding_goals as string[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const priorityCategories = goals.flatMap((g) => GOAL_CATEGORIES[g] ?? []);

  const filtered = challenges
    .filter((c) => filter === "Alle" || (c.category ?? "").toLowerCase() === filter.toLowerCase())
    .sort((a, b) => {
      const aP = priorityCategories.includes(a.category ?? "");
      const bP = priorityCategories.includes(b.category ?? "");
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return 0;
    });

  const activeCount = todayIds.size;

  const toggleToday = async (challengeId: string) => {
    if (!user) return;
    if (todayIds.has(challengeId)) {
      // deactivate
      setTodayIds((prev) => { const n = new Set(prev); n.delete(challengeId); return n; });
      await supabase.from("user_challenges").update({ is_active: false }).eq("user_id", user.id).eq("challenge_id", challengeId);
    } else {
      // activate (upsert)
      setTodayIds((prev) => new Set(prev).add(challengeId));
      await supabase.from("user_challenges").upsert(
        { user_id: user.id, challenge_id: challengeId, is_active: true },
        { onConflict: "user_id,challenge_id" }
      );
    }
  };

  const createChallenge = async () => {
    if (!user || !newTitle.trim()) return;
    const { data } = await supabase.from("challenges").insert({
      title: newTitle.trim(),
      icon: newEmoji,
      category: newCategory,
      is_preset: false,
      user_id: user.id,
    }).select().single();
    if (data) {
      setChallenges((prev) => [data as Challenge, ...prev]);
      // also activate for this user
      await supabase.from("user_challenges").upsert(
        { user_id: user.id, challenge_id: data.id, is_active: true },
        { onConflict: "user_id,challenge_id" }
      );
      setTodayIds((prev) => new Set(prev).add(data.id));
    }
    setNewTitle("");
    setNewEmoji("⭐");
    setCreateOpen(false);
  };

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-foreground text-lg">Challenges</h1>
        <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--mindark-accent-start)", color: "white" }}>
          {activeCount} aktiv
        </span>
      </div>

      {/* CATEGORY FILTER */}
      <SmartChallengeWidget />

      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-colors"
            style={{
              background: filter === c ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)",
              color: filter === c ? "white" : "rgba(255,255,255,0.5)",
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* CREATE OWN */}
      <button onClick={() => setCreateOpen(true)}
        className="w-full rounded-[16px] p-4 mb-5 text-center"
        style={{ border: "2px dashed var(--mindark-accent-start)", background: "transparent" }}>
        <span className="text-sm" style={{ color: "var(--mindark-accent-start)" }}>
          + Eigene Challenge erstellen
        </span>
      </button>

      {/* CHALLENGE LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-[14px]" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ch) => {
            const isActive = todayIds.has(ch.id);
            const isRecommended = priorityCategories.includes(ch.category ?? "");
            return (
              <div key={ch.id}
                className="glass-card p-4 flex items-start gap-3"
                style={isRecommended ? { borderColor: "var(--mindark-accent-start)", borderWidth: 1 } : {}}>
                <span className="text-[28px] leading-none shrink-0">{ch.icon || "✨"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-[14px]">{ch.title}</p>
                  {ch.description && (
                    <p className="text-muted-foreground text-[12px] line-clamp-2 mt-0.5">{ch.description}</p>
                  )}
                  <span className="inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                    {ch.category}
                  </span>
                </div>
                <button onClick={() => toggleToday(ch.id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    background: isActive ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.15)",
                  }}>
                  {isActive ? <Check className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-foreground" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CHALLENGE DRAWER */}
      <Drawer open={createOpen} onOpenChange={setCreateOpen}>
        <DrawerContent style={{ background: "var(--mindark-bg)", borderColor: "var(--mindark-card-border)" }}>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="text-foreground">Deine Challenge</DrawerTitle>
            <DrawerClose asChild>
              <button className="text-muted-foreground">✕</button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            {/* Emoji picker */}
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform"
                  style={{
                    background: newEmoji === e ? "rgba(180,127,232,0.3)" : "rgba(255,255,255,0.08)",
                    border: newEmoji === e ? "2px solid var(--mindark-accent-start)" : "none",
                    transform: newEmoji === e ? "scale(1.15)" : "scale(1)",
                  }}>
                  {e}
                </button>
              ))}
            </div>
            {/* Title input */}
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Challenge beschreiben..."
              className="w-full px-4 py-3 rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c !== "Alle").map((c) => (
                <button key={c} onClick={() => setNewCategory(c.toLowerCase())}
                  className="px-3 py-1 rounded-full text-[12px] transition-colors"
                  style={{
                    background: newCategory === c.toLowerCase() ? "var(--mindark-accent-start)" : "rgba(255,255,255,0.08)",
                    color: newCategory === c.toLowerCase() ? "white" : "rgba(255,255,255,0.5)",
                  }}>
                  {c}
                </button>
              ))}
            </div>
            {/* Submit */}
            <button onClick={createChallenge} disabled={!newTitle.trim()}
              className="btn-pill" style={{ opacity: newTitle.trim() ? 1 : 0.4 }}>
              HINZUFÜGEN
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ChallengesPage;
