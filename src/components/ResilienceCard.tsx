import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import Arkie from "@/components/Arkie";

interface MoodEntry {
  date: string;
  stimmung: number;
  energie: number;
  stress: number;
}

interface Props {
  moods: MoodEntry[];
}

function dayAvg(rows: MoodEntry[]): Map<string, number> {
  const map = new Map<string, { sum: number; n: number }>();
  for (const m of rows) {
    const e = map.get(m.date) ?? { sum: 0, n: 0 };
    e.sum += m.stimmung;
    e.n += 1;
    map.set(m.date, e);
  }
  const out = new Map<string, number>();
  map.forEach((v, k) => out.set(k, v.sum / v.n));
  return out;
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function computeResilience(moods: MoodEntry[]) {
  const byDay = dayAvg(moods);
  const sortedDays = [...byDay.keys()].sort();
  let hardDays = 0;
  let recoveries = 0;
  const recoveryTimes: number[] = [];
  for (const day of sortedDays) {
    if ((byDay.get(day) ?? 100) < 40) {
      hardDays++;
      for (let i = 1; i <= 2; i++) {
        const next = byDay.get(addDays(day, i));
        if (next !== undefined && next > 55) {
          recoveries++;
          recoveryTimes.push(i);
          break;
        }
      }
    }
  }
  const rate = hardDays > 0 ? Math.round((recoveries / hardDays) * 100) : 0;
  const avgRecovery = recoveryTimes.length
    ? Math.round((recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length) * 10) / 10
    : 0;
  return { rate, hardDays, avgRecovery, distinctDays: byDay.size };
}

function computeWindow(moods: MoodEntry[], fromOffset: number, toOffset: number) {
  const now = Date.now();
  const from = new Date(now - fromOffset * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now - toOffset * 86_400_000).toISOString().slice(0, 10);
  const subset = moods.filter((m) => m.date >= from && m.date <= to);
  return computeResilience(subset);
}

const ResilienceCard = ({ moods }: Props) => {
  const [showInfo, setShowInfo] = useState(false);

  const overall = useMemo(() => computeResilience(moods), [moods]);
  const last14 = useMemo(() => computeWindow(moods, 14, 0), [moods]);
  const prev14 = useMemo(() => computeWindow(moods, 28, 14), [moods]);

  const hasEnoughData = overall.distinctDays >= 14;

  const trend = (() => {
    if (prev14.hardDays === 0 || last14.hardDays === 0) return null;
    const diff = last14.rate - prev14.rate;
    return diff;
  })();

  const verdict = (() => {
    if (overall.rate > 80) return "Sehr stark 💪";
    if (overall.rate >= 60) return "Gut 🌱";
    if (overall.rate >= 40) return "Im Aufbau ✨";
    return "Arkie ist für dich da 💜";
  })();

  const arkieMsg = (() => {
    if (overall.rate > 70)
      return "Du findest deinen Weg zurück — immer wieder. Das ist echte Stärke.";
    if (overall.rate >= 40)
      return "Resilienz wächst mit der Zeit. Arkie sieht deinen Fortschritt.";
    return "Schwierige Zeiten brauchen Raum. Arkie ist dabei wenn du schreiben möchtest.";
  })();

  return (
    <div
      className="rounded-[20px] p-[18px] mb-4 relative"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-white text-[16px]">Deine Resilienz</p>
        <button
          onClick={() => setShowInfo((s) => !s)}
          aria-label="Info"
          className="text-muted-foreground hover:text-foreground transition-colors relative"
        >
          <Info className="w-4 h-4" />
          {showInfo && (
            <div
              className="absolute right-0 top-6 z-10 w-56 text-left text-[12px] text-foreground p-3 rounded-lg"
              style={{ background: "rgba(20,15,35,0.96)", border: "1px solid rgba(167,139,250,0.4)" }}
            >
              Wie schnell erholst du dich nach schwierigen Tagen?
            </div>
          )}
        </button>
      </div>

      {!hasEnoughData ? (
        <div className="text-center py-4">
          <div className="arkie-float inline-block mb-2"><Arkie size="small" /></div>
          <p className="text-muted-foreground text-[13px] mb-3">
            Arkie braucht noch etwas Zeit um deine Resilienz zu verstehen.
            Komm in {Math.max(1, 14 - overall.distinctDays)} Tagen wieder.
          </p>
          <div className="w-full h-[6px] rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full gradient-primary"
              style={{ width: `${Math.min(100, (overall.distinctDays / 14) * 100)}%` }} />
          </div>
          <p className="text-muted-foreground text-xs mt-1">{overall.distinctDays}/14 Tage erfasst</p>
        </div>
      ) : (
        <>
          <div className="text-center py-2">
            <p className="text-white font-bold" style={{ fontSize: 36, lineHeight: 1.1 }}>
              {overall.rate}%
            </p>
            <p className="text-muted-foreground text-[13px] mt-1">{verdict}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="text-center">
              <p className="text-muted-foreground text-[11px]">Erholungszeit</p>
              <p className="text-foreground text-[14px] font-medium mt-0.5">
                Ø {overall.avgRecovery || "–"} Tage
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-[11px]">Schwierige Tage</p>
              <p className="text-foreground text-[14px] font-medium mt-0.5">
                {overall.hardDays} in 30 Tagen
              </p>
            </div>
          </div>

          {trend !== null && (
            <div className="mt-3 text-center text-[12px]">
              {trend > 5 && (
                <span style={{ color: "#4ade80" }}>↑ +{trend}% besser als letzten Monat</span>
              )}
              {trend < -5 && (
                <span style={{ color: "#f87171" }}>↓ {trend}% schwieriger als letzten Monat</span>
              )}
              {trend >= -5 && trend <= 5 && (
                <span className="text-muted-foreground">→ Ähnlich wie letzten Monat</span>
              )}
            </div>
          )}

          <div
            className="mt-4 rounded-[14px] p-3 flex items-start gap-2"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
          >
            <div className="shrink-0 mt-0.5"><Arkie size="small" /></div>
            <p className="text-foreground text-[13px] leading-relaxed">{arkieMsg}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ResilienceCard;