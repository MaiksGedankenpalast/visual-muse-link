import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Arkie from "@/components/Arkie";
import { useAuth } from "@/hooks/useAuth";
import {
  SmartChallengeRow,
  generateSmartChallenge,
  getTodaySmartChallenge,
  hasEnoughData,
  toggleSmartChallengeCompleted,
} from "@/lib/smartChallenge";

const SmartChallengeWidget = () => {
  const { user, profileName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enoughData, setEnoughData] = useState(true);
  const [row, setRow] = useState<SmartChallengeRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      setLoading(true);
      const existing = await getTodaySmartChallenge(user.id);
      if (!mounted) return;
      if (existing) {
        setRow(existing);
        setLoading(false);
        return;
      }
      const ok = await hasEnoughData(user.id);
      if (!mounted) return;
      setEnoughData(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      setGenerating(true);
      const created = await generateSmartChallenge(user.id, profileName ?? undefined);
      if (!mounted) return;
      setRow(created);
      setGenerating(false);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user, profileName]);

  const onToggle = async () => {
    if (!row) return;
    const next = !row.completed;
    setRow({ ...row, completed: next });
    if (next) {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 900);
    }
    await toggleSmartChallengeCompleted(row.id, next);
  };

  // Shared outer wrapper with animated glow border
  const Glow = ({ children }: { children: React.ReactNode }) => (
    <div className="smart-glow-wrap mb-5">
      <div className="smart-glow-inner">{children}</div>
    </div>
  );

  if (loading) {
    return (
      <Glow>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </Glow>
    );
  }

  if (!enoughData) {
    return (
      <Glow>
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <Arkie size="small" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.15em] text-[rgba(180,127,232,0.9)] uppercase">
              Arkies Geheimtipp
            </p>
            <p className="text-[13px] text-foreground/90 mt-1 leading-snug">
              Arkie lernt dich noch kennen… log ein paar Moods oder Journal-Einträge, dann kommt dein erster Tipp ✨
            </p>
          </div>
        </div>
      </Glow>
    );
  }

  if (!row) {
    return (
      <Glow>
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <Arkie size="small" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.15em] text-[rgba(180,127,232,0.9)] uppercase">
              Arkies Geheimtipp
            </p>
            <p className="text-[13px] text-foreground/80 mt-1 leading-snug">
              {generating ? "Arkie denkt sich gerade etwas für dich aus…" : "Heute leider kein Tipp verfügbar."}
            </p>
          </div>
        </div>
      </Glow>
    );
  }

  const isDone = row.completed;

  return (
    <Glow>
      <div className="flex items-start gap-3">
        <div className="shrink-0 -mt-1 -ml-1">
          <Arkie size="small" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[rgba(180,127,232,0.9)] uppercase flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Arkies Geheimtipp
          </p>
          <p
            className={`text-[14px] mt-1 leading-snug transition-colors ${
              isDone ? "text-foreground/50 line-through" : "text-foreground"
            }`}
          >
            {row.challenge_text}
          </p>
        </div>
        <button
          onClick={onToggle}
          aria-label={isDone ? "Als offen markieren" : "Als erledigt markieren"}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-transform"
          style={{
            background: isDone
              ? "linear-gradient(135deg, #b47fe8, #7aa8ff)"
              : "rgba(255,255,255,0.08)",
            border: isDone ? "none" : "1px solid rgba(255,255,255,0.18)",
            boxShadow: justChecked ? "0 0 22px 4px rgba(180,127,232,0.75)" : "none",
            transform: justChecked ? "scale(1.08)" : "scale(1)",
          }}
        >
          <Check className={`w-4 h-4 ${isDone ? "text-white" : "text-foreground/70"}`} />
        </button>
      </div>
    </Glow>
  );
};

export default SmartChallengeWidget;