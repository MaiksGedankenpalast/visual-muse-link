import { useState, useEffect, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [firstSeenAt, setFirstSeenAt] = useState<string | null>(null);
  const [missing, setMissing] = useState<Period[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sizeLabel = type === "weekly" ? "Woche" : "4-Wochen-Zyklus";
  const periodCountLabel = type === "weekly" ? "Woche" : "4 Wochen";

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
      setError(e?.message ?? "Konnte Reviews nicht laden.");
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
      setError(e?.message ?? "Generierung fehlgeschlagen.");
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
      setError(e?.message ?? "Generierung fehlgeschlagen.");
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

  return (
    <div className="space-y-4">
      {/* CURRENT / LATEST REVIEW PANEL */}
      <div className="glass-card p-5">
        {missing.length > 0 && (!currentReview || currentReview.period_start !== missing[missing.length - 1].start) && (
          <div className="mb-4 rounded-[14px] p-4" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <p className="text-foreground text-sm mb-3">
              {missing.length === 1
                ? `Ein neuer Rückblick ist bereit: ${formatDe(missing[missing.length - 1].start)} – ${formatDe(missing[missing.length - 1].end)}`
                : `${missing.length} Rückblicke ausstehend. Der neueste wird zuerst erstellt.`}
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2.5 rounded-full text-sm font-medium text-foreground disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))" }}
            >
              {generating ? "Wird geschrieben..." : "Jetzt generieren"}
            </button>
          </div>
        )}

        {generating && (
          <div className="flex items-center gap-3 mb-4">
            <div className="arkie-float"><Arkie size="small" /></div>
            <p className="text-muted-foreground text-sm">Dein Rückblick wird geschrieben...</p>
          </div>
        )}

        {!currentReview && missing.length === 0 && nextDue && (
          <div className="text-center py-6">
            <div className="arkie-float inline-block mb-3"><Arkie size="small" /></div>
            <p className="text-foreground text-sm">
              Dein nächster {sizeLabel}-Rückblick ist bereit am
            </p>
            <p className="text-foreground font-bold mt-1">{formatDe(nextDue)}</p>
          </div>
        )}

        {currentReview && (
          <ReviewContent review={currentReview} onRetry={() => handleRetry(currentReview)} generating={generating} />
        )}

        {error && (
          <p className="text-sm mt-3" style={{ color: "#ef4444" }}>{error}</p>
        )}
      </div>

      {/* STATS SNAPSHOT */}
      {currentReview?.stats_snapshot && (
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Mood-Ø</p>
            <p className="text-foreground font-bold text-lg">
              {currentReview.stats_snapshot.mood.avg_score ?? "—"} <span className="text-sm">{trendArrow(currentReview.stats_snapshot.mood.trend)}</span>
            </p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Challenges</p>
            <p className="text-foreground font-bold text-lg">{currentReview.stats_snapshot.challenges.completion_rate}%</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Tagebuch</p>
            <p className="text-foreground font-bold text-lg">📝 {currentReview.stats_snapshot.diary.total}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">Chats</p>
            <p className="text-foreground font-bold text-lg">💬 {currentReview.stats_snapshot.chat.sessions}</p>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {reviews.length > 1 && (
        <div>
          <p className="font-bold text-foreground text-sm mb-2 mt-2">Frühere Rückblicke</p>
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
                        Mood-Ø {r.stats_snapshot?.mood.avg_score ?? "—"} · {r.stats_snapshot?.challenges.completion_rate ?? 0}% Challenges
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
