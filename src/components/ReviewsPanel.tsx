import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, RefreshCw, ChevronRight, Hourglass } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Arkie from "@/components/Arkie";
import {
  ReviewRow,
  ReviewType,
  Period,
  calculatePeriods,
  nextDueDate,
  findMissingPeriods,
  listReviews,
  generateWeeklyReview,
  generateFourWeeklyReview,
  ensureUserAppStart,
  todayLocal,
} from "@/lib/reviews";

interface Props {
  userId: string;
  type: ReviewType;
}

function formatDe(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
function formatLongDe(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${WEEKDAYS_DE[d.getDay()]}, ${d.getDate()}. ${MONTHS_DE[d.getMonth()]}`;
}

function trendArrow(trend: "improving" | "declining" | "stable" | undefined): string {
  if (trend === "improving") return "↑";
  if (trend === "declining") return "↓";
  return "→";
}

const ReviewsPanel = ({ userId, type }: Props) => {
  const { t, i18n } = useTranslation();
  const isEN = i18n.language === "en";
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [firstSeenAt, setFirstSeenAt] = useState<string | null>(null);
  const [missing, setMissing] = useState<Period[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [briefExpanded, setBriefExpanded] = useState(false);

  const sizeLabel = type === "weekly" ? t("Woche") : t("4-Wochen-Zyklus");
  const periodCountLabel = type === "weekly" ? t("Woche") : t("4 Wochen");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayLocal();
      const first = await ensureUserAppStart(userId);
      setFirstSeenAt(first);
      const list = await listReviews(userId, type);
      setReviews(list);
      const periods = calculatePeriods(first, type, today);
      setMissing(findMissingPeriods(periods, list));
    } catch (e: any) {
      setError(e?.message ?? t("Konnte Reviews nicht laden."));
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    if (!firstSeenAt || missing.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const period = missing[missing.length - 1]; // most recent missing is last (calculatePeriods ascending)
      if (type === "weekly") {
        await generateWeeklyReview(userId, period);
      } else {
        await generateFourWeeklyReview(userId, period, firstSeenAt);
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? t("Generierung fehlgeschlagen."));
    } finally {
      setGenerating(false);
    }
  };

  const handleRetry = async (review: ReviewRow) => {
    if (!firstSeenAt) return;
    setGenerating(true);
    setError(null);
    try {
      const period: Period = {
        index: 1,
        start: review.period_start,
        end: review.period_end,
      };
      if (type === "weekly") await generateWeeklyReview(userId, period);
      else await generateFourWeeklyReview(userId, period, firstSeenAt);
      await load();
    } catch (e: any) {
      setError(e?.message ?? t("Generierung fehlgeschlagen."));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-[20px]" />
        <Skeleton className="h-24 rounded-[20px]" />
      </div>
    );
  }

  const currentReview = reviews[0]; // most recent
  const nextDue = firstSeenAt ? nextDueDate(firstSeenAt, type, todayLocal()) : null;
  const today = todayLocal();
  const isReady = missing.length > 0;
  const isReadyToday = isReady && missing[missing.length - 1].end < today;
  const briefDate = isReady ? today : (nextDue ?? today);
  const isWeekly = type === "weekly";

  const briefLabel = isWeekly ? t("ARKIES WOCHENBRIEF") : t("ARKIES MONATSBRIEF");
  const briefMidReady = isWeekly
    ? t("Arkies Wochenbrief wartet auf dich ✨")
    : t("Dein Monatsbrief ist angekommen 💜");
  const briefSubReady = isWeekly
    ? t("Tippe um zu lesen")
    : t("28 Tage — Arkie hat alles gesehen");
  const briefMidPending = isWeekly
    ? t("Arkie hat bald einen Brief für dich 💌")
    : t("Arkie schreibt deinen Monatsbrief 🔮");
  const briefSubPending = isWeekly
    ? t("Dein nächster Wochenrückblick ist bereit am {{date}}", { date: formatLongDe(briefDate) })
    : t("Bereit am {{date}}", { date: formatLongDe(briefDate) });

  return (
    <div className="space-y-4">
      {/* ARKIE BRIEF CARD */}
      <button
        type="button"
        onClick={() => {
          if (isReady && !generating) {
            handleGenerate();
            setBriefExpanded(true);
          } else if (currentReview) {
            setBriefExpanded((v) => !v);
          }
        }}
        className="w-full text-left flex items-center gap-3 transition-transform active:scale-[0.99]"
        style={{
          background: "rgba(139,92,246,0.12)",
          border: `1px solid ${isReady ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.3)"}`,
          borderRadius: 20,
          padding: 16,
          boxShadow: isReady ? "0 0 24px rgba(139,92,246,0.25)" : "none",
        }}
      >
        <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
          <Arkie size={40} />
          <span className="absolute -bottom-1 -right-1 text-[14px] leading-none">💌</span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-semibold uppercase mb-0.5"
            style={{ letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)" }}
          >
            {briefLabel}
          </p>
          <p className="text-foreground font-bold" style={{ fontSize: 16, lineHeight: 1.3 }}>
            {isReady ? briefMidReady : briefMidPending}
          </p>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: 13 }}>
            {generating ? t("Dein Brief wird geschrieben...") : (isReady ? briefSubReady : briefSubPending)}
          </p>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {isReady ? <ChevronRight className="w-5 h-5" /> : <Hourglass className="w-4 h-4" />}
        </div>
      </button>

      {error && (
        <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
      )}

      {/* CURRENT REVIEW NARRATIVE (only shown after expansion / after generation) */}
      {currentReview && (briefExpanded || (!isReady && currentReview.status === "complete")) && (
        <div className="glass-card p-5">
          <ReviewContent review={currentReview} onRetry={() => handleRetry(currentReview)} generating={generating} />
        </div>
      )}

      {/* STATS SNAPSHOT */}
      {currentReview?.stats_snapshot && (briefExpanded || (!isReady && currentReview.status === "complete")) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">{t("Mood-Ø")}</p>
            <p className="text-foreground font-bold text-lg">
              {currentReview.stats_snapshot.mood.avg_score ?? "—"} <span className="text-sm">{trendArrow(currentReview.stats_snapshot.mood.trend)}</span>
            </p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">{t("Challenges")}</p>
            <p className="text-foreground font-bold text-lg">{currentReview.stats_snapshot.challenges.completion_rate}%</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">{t("Tagebuch")}</p>
            <p className="text-foreground font-bold text-lg">📝 {currentReview.stats_snapshot.diary.total}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">{t("Chats")}</p>
            <p className="text-foreground font-bold text-lg">💬 {currentReview.stats_snapshot.chat.sessions}</p>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {reviews.length > 1 && (
        <div>
          <p className="font-bold text-foreground text-sm mb-2 mt-2">{t("Frühere Rückblicke")}</p>
          <div className="space-y-2">
            {reviews.slice(1).map((r, idx) => {
              const periodNumber = reviews.length - (idx + 1); // descending; oldest has smallest number
              const open = expandedId === r.id;
              return (
                <div key={r.id} className="glass-card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(open ? null : r.id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div>
                      <p className="text-foreground text-sm font-medium">
                        {periodCountLabel} {periodNumber}: {formatDe(r.period_start)} – {formatDe(r.period_end)}
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {t("Mood-Ø")} {r.stats_snapshot?.mood.avg_score ?? "—"} · {r.stats_snapshot?.challenges.completion_rate ?? 0}% {t("Challenges")}
                      </p>
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {open && (
                    <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: "var(--mindark-card-border)" }}>
                      <ReviewContent review={r} onRetry={() => handleRetry(r)} generating={generating} compact />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewContent = ({
  review,
  onRetry,
  generating,
  compact,
}: {
  review: ReviewRow;
  onRetry: () => void;
  generating: boolean;
  compact?: boolean;
}) => {
  if (review.status === "generating") {
    const tg = (k: string) => k;
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
        <p className="text-muted-foreground text-xs mt-2">Dein Rückblick wird geschrieben...</p>
      </div>
    );
  }
  if (review.status === "error") {
    return (
      <div className="text-center py-4">
        <p className="text-foreground text-sm mb-3">Etwas ist beim Erstellen schiefgelaufen.</p>
        <button
          onClick={onRetry}
          disabled={generating}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-full text-sm font-medium text-foreground disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </button>
      </div>
    );
  }
  if (review.status === "complete" && review.llm_narrative) {
    return (
      <div className={`prose prose-invert max-w-none ${compact ? "text-sm" : ""}`}>
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h3 className="text-foreground font-bold text-base mt-3 mb-1">{children}</h3>,
            h2: ({ children }) => <h3 className="text-foreground font-bold text-sm mt-3 mb-1">{children}</h3>,
            h3: ({ children }) => <h4 className="text-foreground font-semibold text-sm mt-2 mb-1">{children}</h4>,
            p: ({ children }) => <p className="text-foreground/90 text-sm leading-relaxed mb-2">{children}</p>,
            strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc list-inside text-foreground/90 text-sm space-y-1 mb-2">{children}</ul>,
            li: ({ children }) => <li className="text-foreground/90">{children}</li>,
          }}
        >
          {review.llm_narrative}
        </ReactMarkdown>
      </div>
    );
  }
  return null;
};

export default ReviewsPanel;
