import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resetPitchData } from "@/lib/seedPitchData";
import ArkieScene from "@/components/ArkieScene";
import Arkie from "@/components/Arkie";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ChevronRight, RotateCcw, Settings as SettingsIcon, X } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose,
} from "@/components/ui/drawer";

const SLIDER_LABELS = ["Glücklich", "Ruhig", "Selbstsicher", "Aufgeregt", "Ausgeruht"];

const germanDate = () => {
  const d = new Date();
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
};
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const todayStr = () => new Date().toISOString().slice(0, 10);
const buzz = (pattern: number | number[] = 8) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { (navigator as Navigator).vibrate(pattern); } catch { /* ignore */ }
  }
};

interface MoodRow {
  id: string;
  happy_sad: number;
  calm_anxious: number;
  confident_insecure: number;
  excited_bored: number;
  rested_tired: number;
  tags: string[] | null;
  created_at: string;
}

interface JournalRow {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
}

type TimelineItem =
  | { kind: "mood"; row: MoodRow }
  | { kind: "journal"; row: JournalRow };

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profileName } = useAuth();
  const name = profileName || "du";

  const [showMomentsHint, setShowMomentsHint] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("shown_moments_hint")) {
      setShowMomentsHint(true);
    }
  }, []);

  const goMoments = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("shown_moments_hint", "1");
      setShowMomentsHint(false);
    }
    window.dispatchEvent(new CustomEvent("swiper:go-to", { detail: 1 }));
  };

  const [loading, setLoading] = useState(true);
  const [todayMoods, setTodayMoods] = useState<MoodRow[]>([]);
  const [todayJournals, setTodayJournals] = useState<JournalRow[]>([]);
  const [expanded, setExpanded] = useState<TimelineItem | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const t = todayStr();
    const [{ data: moods }, { data: journals }] = await Promise.all([
      supabase.from("mood_entries")
        .select("id, happy_sad, calm_anxious, confident_insecure, excited_bored, rested_tired, tags, created_at")
        .eq("user_id", user.id).eq("date", t)
        .order("created_at", { ascending: false }),
      supabase.from("journal_entries")
        .select("id, title, content, created_at")
        .eq("user_id", user.id).eq("date", t)
        .order("created_at", { ascending: false }),
    ]);
    setTodayMoods((moods as MoodRow[]) ?? []);
    setTodayJournals((journals as JournalRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: refresh when this user inserts mood or journal entries
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`home-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mood_entries", filter: `user_id=eq.${user.id}` }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries", filter: `user_id=eq.${user.id}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAll]);

  const latestMood = todayMoods[0] ?? null;
  const journalDone = todayJournals.length > 0;
  const dominantTag = latestMood?.tags?.[0] ?? null;

  const arkieStatus = (() => {
    if (!latestMood) return "Arkie wartet auf deinen ersten Eintrag 🌙";
    const avg = (latestMood.happy_sad + latestMood.calm_anxious + latestMood.confident_insecure + latestMood.excited_bored + latestMood.rested_tired) / 5;
    if (avg < 35) return "Arkie freut sich mit dir 💜";
    if (avg <= 65) return "Arkie ist neugierig auf deinen Tag ✨";
    return "Arkie denkt an dich 🌙";
  })();

  const openChat = () => {
    buzz(8);
    window.dispatchEvent(new CustomEvent("arkie:open-chat"));
  };

  const goJournal = () => { buzz(8); navigate("/journal/new"); };
  const goMood = () => { buzz(8); navigate("/moodtracker"); };

  const timeline: TimelineItem[] = [
    ...todayMoods.map((row) => ({ kind: "mood" as const, row })),
    ...todayJournals.map((row) => ({ kind: "journal" as const, row })),
  ].sort((a, b) => b.row.created_at.localeCompare(a.row.created_at));

  const timeStr = (iso: string) =>
    new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="pb-4 space-y-5 onboarding-slide">
      {/* HEADER */}
      <div className="px-4 pt-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{capitalize(germanDate())}</p>
          <h1 className="text-[28px] font-bold text-foreground mt-1">Hallo {name} 👋</h1>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {user?.email === "pitch@mindark.app" && (
            <button
              onClick={async () => {
                if (!user) return;
                await resetPitchData(user.id);
                await supabase.auth.signOut();
                navigate("/login", { replace: true });
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <div className="relative flex flex-col items-center">
            <button
              onClick={goMoments}
              className="opacity-50 active:opacity-100 transition-opacity duration-150"
              aria-label="Momente"
            >
              <ChevronRight size={20} className="text-white" />
            </button>
            {showMomentsHint && (
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[9px] text-muted-foreground/40 whitespace-nowrap">
                Momente
              </span>
            )}
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* ARKIE WAVES */}
      <ArkieScene arkieSize="large" statusText={arkieStatus} />

      <div className="px-4 space-y-4">
        {loading ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-[20px]" />
              <Skeleton className="h-24 rounded-[20px]" />
            </div>
            <Skeleton className="h-20 rounded-[20px]" />
            <Skeleton className="h-40 rounded-[20px]" />
          </>
        ) : (
          <>
            {/* JOURNAL + MOOD — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={goJournal}
                className="action-card group relative text-left p-[16px] rounded-[20px] min-h-[80px] flex flex-col justify-between transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(167,139,250,0.3)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 0 20px rgba(139,92,246,0.2), 0 0 40px rgba(139,92,246,0.08)",
                }}
              >
                <div>
                  <p className="font-bold text-white text-[17px]">Tagebuch</p>
                  <p className="italic text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {journalDone ? "Weiterschreiben" : "Schreib drauf los…"}
                  </p>
                </div>
                <span className="self-end text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>→</span>
              </button>

              <button
                onClick={goMood}
                className="action-card group relative text-left p-[16px] rounded-[20px] min-h-[80px] flex flex-col justify-between transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(129,140,248,0.3)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 0 20px rgba(99,102,241,0.2), 0 0 40px rgba(99,102,241,0.08)",
                }}
              >
                <div>
                  <p className="font-bold text-white text-[17px]">Mood</p>
                  <p className="italic text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {latestMood
                      ? (dominantTag ? `${dominantTag} ✓` : "Mood erfasst ✓")
                      : "Wie fühlst du dich?"}
                  </p>
                </div>
                <span className="self-end text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>→</span>
              </button>
            </div>

            {/* MOOD CAPSULES */}
            <MoodCapsules latestMood={latestMood} onAdd={goMood} />

            {/* ARKIE SESSION CARD — outlined */}
            <button
              onClick={openChat}
              className="arkie-glow-border action-card relative w-full text-left p-[16px] rounded-[20px] flex items-center gap-3 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(109,40,217,0.4), rgba(139,92,246,0.25))",
                border: "1px solid rgba(167,139,250,0.25)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 0 24px rgba(109,40,217,0.25)",
              }}
            >
              <Arkie size={48} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-[16px]">Arkie Session</p>
                <p className="italic text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Gespräch starten →
                </p>
              </div>
              <MessageCircle className="w-5 h-5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            </button>

            {/* TIMELINE */}
            <div>
              <p className="font-bold text-foreground text-[16px] mb-3">Heute</p>
              {timeline.length === 0 ? (
                <div className="text-center py-6 flex flex-col items-center gap-2">
                  <Arkie size="small" />
                  <p className="text-muted-foreground text-sm">
                    Noch nichts heute — wie war dein Tag bisher?
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeline.map((it) => {
                    const isMood = it.kind === "mood";
                    const title = isMood ? "Mood" : "Tagebuch";
                    const preview = isMood
                      ? ((it.row as MoodRow).tags ?? []).slice(0, 3).join(", ") || "Mood-Eintrag"
                      : (it.row as JournalRow).title;
                    return (
                      <div
                        key={`${it.kind}-${it.row.id}`}
                        className="timeline-row flex items-stretch gap-3 rounded-[14px] p-3"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="text-[11px] text-muted-foreground w-[44px] shrink-0 pt-0.5">
                          {timeStr(it.row.created_at)}
                        </div>
                        <div className="w-px shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-[14px]">{title}</p>
                          <p className="text-muted-foreground text-[12px] truncate">{preview}</p>
                        </div>
                        <button
                          onClick={() => { buzz(8); setExpanded(it); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: "rgba(139,92,246,0.25)" }}
                          aria-label="Eintrag öffnen"
                        >
                          <ChevronRight className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* DETAIL BOTTOM SHEET */}
      <Drawer open={!!expanded} onOpenChange={(o) => !o && setExpanded(null)}>
        <DrawerContent
          className="border-t-0 max-h-[85vh] flex flex-col"
          style={{ background: "var(--mindark-bg)", borderColor: "var(--mindark-card-border)" }}
        >
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="text-foreground">
              {expanded?.kind === "mood" ? "Mood-Eintrag" : "Tagebuch-Eintrag"}
            </DrawerTitle>
            <DrawerClose asChild>
              <button className="text-muted-foreground" aria-label="Schließen"><X className="w-5 h-5" /></button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto scrollbar-hide">
            {expanded?.kind === "mood" && (() => {
              const m = expanded.row as MoodRow;
              const vals = [m.happy_sad, m.calm_anxious, m.confident_insecure, m.excited_bored, m.rested_tired];
              return (
                <>
                  <p className="text-center text-[12px] text-muted-foreground mb-4">
                    {new Date(m.created_at).toLocaleString("de-DE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="flex justify-between gap-2 mb-4">
                    {vals.map((val, i) => {
                      const pct = 100 - val;
                      return (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div className="relative w-full overflow-hidden"
                            style={{ height: 130, background: "rgba(255,255,255,0.06)", borderRadius: 22 }}>
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gradient-primary"
                              style={{ height: `${pct}%`, borderRadius: "0 0 22px 22px" }}>
                              <span className="text-foreground font-bold text-[12px]">{pct}%</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-2 text-center leading-tight">{SLIDER_LABELS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                  {m.tags && m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.tags.map((t) => (
                        <span key={t} className="text-xs px-3 py-1 rounded-full"
                          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            {expanded?.kind === "journal" && (() => {
              const j = expanded.row as JournalRow;
              return (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Arkie size="small" />
                    <p className="text-[12px] text-muted-foreground">
                      {new Date(j.created_at).toLocaleString("de-DE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <h2 className="text-foreground font-bold text-[20px] mb-3">{j.title}</h2>
                  <p className="text-foreground text-[16px] leading-relaxed whitespace-pre-wrap">
                    {j.content || "Kein Inhalt."}
                  </p>
                </>
              );
            })()}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default HomePage;