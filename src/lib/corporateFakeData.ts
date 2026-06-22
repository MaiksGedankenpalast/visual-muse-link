// Seeded fake data generator for Northwind Labs corporate dashboard.
// Deterministic: same seed -> same data, so pitch demos are reproducible.

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260622);

export type DepartmentKey =
  | "engineering"
  | "sales"
  | "marketing"
  | "customer_success"
  | "people_hr"
  | "finance";

export interface Department {
  key: DepartmentKey;
  name: string;
  headcount: number;
  baseline: number;
  sundayDip: number;
  workload: number;
  volatility: number;
  topicMix: Record<TopicKey, number>;
}

export type TopicKey =
  | "workload"
  | "team"
  | "work_life"
  | "motivation"
  | "leadership";

export const TOPIC_LABELS: Record<TopicKey, string> = {
  workload: "Workload",
  team: "Team",
  work_life: "Work-Life Balance",
  motivation: "Motivation",
  leadership: "Leadership",
};

export const DEPARTMENTS: Department[] = [
  { key: "engineering", name: "Engineering", headcount: 38, baseline: 68, sundayDip: 9, workload: 0.62, volatility: 0.8, topicMix: { workload: 0.34, team: 0.16, work_life: 0.22, motivation: 0.14, leadership: 0.14 } },
  { key: "sales", name: "Sales", headcount: 26, baseline: 64, sundayDip: 7, workload: 0.78, volatility: 1.1, topicMix: { workload: 0.42, team: 0.12, work_life: 0.18, motivation: 0.18, leadership: 0.10 } },
  { key: "marketing", name: "Marketing", headcount: 22, baseline: 71, sundayDip: 5, workload: 0.58, volatility: 0.7, topicMix: { workload: 0.28, team: 0.22, work_life: 0.18, motivation: 0.20, leadership: 0.12 } },
  { key: "customer_success", name: "Customer Success", headcount: 18, baseline: 66, sundayDip: 6, workload: 0.66, volatility: 0.9, topicMix: { workload: 0.30, team: 0.24, work_life: 0.20, motivation: 0.14, leadership: 0.12 } },
  { key: "people_hr", name: "People & HR", headcount: 12, baseline: 74, sundayDip: 4, workload: 0.48, volatility: 0.6, topicMix: { workload: 0.18, team: 0.34, work_life: 0.18, motivation: 0.14, leadership: 0.16 } },
  { key: "finance", name: "Finance", headcount: 8, baseline: 70, sundayDip: 5, workload: 0.54, volatility: 0.7, topicMix: { workload: 0.32, team: 0.18, work_life: 0.22, motivation: 0.16, leadership: 0.12 } },
];

export const COMPANY_NAME = "Northwind Labs";
export const TOTAL_HEADCOUNT = DEPARTMENTS.reduce((s, d) => s + d.headcount, 0);
export const K_THRESHOLD = 5;

const WEEKS = 12;
const DAYS = WEEKS * 7;

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export interface DeptDaily {
  key: DepartmentKey;
  daily: number[];
  workload: number[];
}

function generateDeptDaily(d: Department): DeptDaily {
  const daily: number[] = [];
  const workload: number[] = [];
  const trendPerDay = 8 / DAYS;
  for (let i = 0; i < DAYS; i++) {
    const dayOfWeek = i % 7;
    let dow = 0;
    if (dayOfWeek === 0) dow = -d.sundayDip * 0.4;
    if (dayOfWeek === 1) dow = -d.sundayDip;
    if (dayOfWeek === 4) dow = +2;
    if (dayOfWeek === 5) dow = +4;
    const noise = (rand() - 0.5) * 8 * d.volatility;
    let event = 0;
    if (d.key === "sales" && i > DAYS - 30 && i < DAYS - 22) event = -7;
    if (d.key === "marketing" && i > 40 && i < 50) event = -5;
    if (d.key === "engineering" && i > 60 && i < 68) event = -4;
    const val = clamp(d.baseline + i * trendPerDay + dow + noise + event);
    daily.push(val);

    const wlNoise = (rand() - 0.5) * 0.12;
    let wl = d.workload + wlNoise;
    if (d.key === "sales" && i > DAYS - 30 && i < DAYS - 22) wl += 0.18;
    if (d.key === "marketing" && i > 40 && i < 50) wl += 0.15;
    workload.push(Math.max(0, Math.min(1, wl)));
  }
  return { key: d.key, daily, workload };
}

export const DEPT_DAILY: Record<DepartmentKey, DeptDaily> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, generateDeptDaily(d)])
) as Record<DepartmentKey, DeptDaily>;

function avg(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function lastNDaysAvg(arr: number[], n: number) {
  return avg(arr.slice(-n));
}

function aggregateDaily(): { wellbeing: number[]; workload: number[] } {
  const out: number[] = [];
  const wl: number[] = [];
  for (let i = 0; i < DAYS; i++) {
    let sw = 0, ww = 0, hc = 0;
    for (const d of DEPARTMENTS) {
      sw += DEPT_DAILY[d.key].daily[i] * d.headcount;
      ww += DEPT_DAILY[d.key].workload[i] * d.headcount;
      hc += d.headcount;
    }
    out.push(sw / hc);
    wl.push(ww / hc);
  }
  return { wellbeing: out, workload: wl };
}

export const COMPANY_DAILY = aggregateDaily();

export interface Kpi {
  current: number;
  delta: number;
  trend: number[];
}

function toWeekly(daily: number[]): number[] {
  const w: number[] = [];
  for (let i = 0; i < WEEKS; i++) {
    w.push(avg(daily.slice(i * 7, (i + 1) * 7)));
  }
  return w;
}

export function getKpis(deptFilter: DepartmentKey | "all" = "all") {
  const source = deptFilter === "all" ? COMPANY_DAILY.wellbeing : DEPT_DAILY[deptFilter].daily;
  const sourceWL = deptFilter === "all" ? COMPANY_DAILY.workload : DEPT_DAILY[deptFilter].workload;

  const weekly = toWeekly(source);
  const last2w = avg(source.slice(-14));
  const prev2w = avg(source.slice(-28, -14));

  let upAfterDip = 0;
  let dips = 0;
  for (let i = source.length - 28; i < source.length - 1; i++) {
    if (source[i] < source[i - 1] - 3) {
      dips++;
      if (source[i + 1] > source[i] + 2) upAfterDip++;
    }
  }
  const recovery = dips ? Math.round((upAfterDip / dips) * 100) : 72;

  const engagement = clamp(58 + (weekly[weekly.length - 1] - weekly[0]) * 0.6, 0, 100);

  let totalSwing = 0;
  for (let i = 1; i < source.length; i++) totalSwing += Math.abs(source[i] - source[i - 1]);
  const avgSwing = totalSwing / (source.length - 1);
  const resilience = clamp(100 - avgSwing * 4);

  const recentWB = lastNDaysAvg(source, 14);
  const recentWL = lastNDaysAvg(sourceWL, 14);
  const burnoutPct = clamp(recentWL * 70 + (100 - recentWB) * 0.4, 0, 100);

  return {
    wellbeing: { current: Math.round(last2w), delta: Math.round((last2w - prev2w) * 10) / 10, trend: weekly.map((v) => Math.round(v)) } as Kpi,
    resilience: { current: Math.round(resilience), delta: 0, trend: weekly.map((v) => Math.round(clamp(100 - Math.abs(v - 70) * 1.2))) } as Kpi,
    recovery: { current: recovery, delta: 0, trend: weekly.map((v) => Math.round(clamp(60 + (v - 65) * 0.8))) } as Kpi,
    engagement: { current: Math.round(engagement), delta: 0, trend: weekly.map((_, i) => Math.round(clamp(58 + i * 0.9))) } as Kpi,
    burnout: { current: Math.round(burnoutPct), delta: 0, trend: weekly } as Kpi,
  };
}

export function getSundayIndex() {
  return DEPARTMENTS.map((d) => {
    const series = DEPT_DAILY[d.key].daily;
    const weekly: number[] = [];
    for (let w = WEEKS - 8; w < WEEKS; w++) {
      const sun = series[w * 7];
      const mon = series[w * 7 + 1];
      weekly.push(Math.round(mon - sun));
    }
    return { dept: d.key, name: d.name, weekly, avg: avg(weekly) };
  });
}

export function getBurnoutHeatmap() {
  return DEPARTMENTS.map((d) => {
    const daily = DEPT_DAILY[d.key].daily;
    const wl = DEPT_DAILY[d.key].workload;
    const weekly: number[] = [];
    for (let w = 0; w < WEEKS; w++) {
      const wb = avg(daily.slice(w * 7, (w + 1) * 7));
      const wlw = avg(wl.slice(w * 7, (w + 1) * 7));
      weekly.push(Math.round(clamp(wlw * 70 + (100 - wb) * 0.4)));
    }
    return { dept: d.key, name: d.name, weekly };
  });
}

export function getWorkloadPressure() {
  return DEPARTMENTS.map((d) => ({
    dept: d.key,
    name: d.name,
    weekly: toWeekly(DEPT_DAILY[d.key].workload).map((v) => Math.round(v * 100)),
  }));
}

export function getEmotionalBandwidth() {
  return DEPARTMENTS.map((d) => {
    const daily = DEPT_DAILY[d.key].daily;
    const weekly: number[] = [];
    for (let w = 0; w < WEEKS; w++) {
      const slice = daily.slice(w * 7, (w + 1) * 7);
      const m = avg(slice);
      const variance = avg(slice.map((x) => (x - m) ** 2));
      weekly.push(Math.round(Math.sqrt(variance)));
    }
    return { dept: d.key, name: d.name, weekly };
  });
}

export function getTopicClusters(deptFilter: DepartmentKey | "all" = "all") {
  if (deptFilter === "all") {
    const totals: Record<TopicKey, number> = { workload: 0, team: 0, work_life: 0, motivation: 0, leadership: 0 };
    let hc = 0;
    for (const d of DEPARTMENTS) {
      for (const k of Object.keys(d.topicMix) as TopicKey[]) totals[k] += d.topicMix[k] * d.headcount;
      hc += d.headcount;
    }
    return (Object.keys(totals) as TopicKey[]).map((k) => ({ key: k, label: TOPIC_LABELS[k], pct: Math.round((totals[k] / hc) * 100) }));
  }
  const d = DEPARTMENTS.find((x) => x.key === deptFilter)!;
  return (Object.keys(d.topicMix) as TopicKey[]).map((k) => ({ key: k, label: TOPIC_LABELS[k], pct: Math.round(d.topicMix[k] * 100) }));
}

export interface PulseLetter {
  id: string;
  date: string;
  type: "pulse" | "alert";
  title: string;
  body: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const PULSE_LETTERS: PulseLetter[] = [
  {
    id: "alert-1",
    date: daysAgo(1),
    type: "alert",
    title: "Early-warning signal · Sales",
    body: "**Workload-Pressure** in Sales is **+18%** this week vs. the 8-week baseline. The Sunday-to-Monday dip has also deepened by ~3 points.\n\nThis pattern often precedes engagement drops within 2–3 weeks. **Suggestion:** consider a no-meeting Friday afternoon, or a quick 1:1 check-in round before next sprint planning. All numbers reflect ≥5 people per signal — no individuals are visible.",
  },
  {
    id: "pulse-1",
    date: daysAgo(3),
    type: "pulse",
    title: "3-day pulse · Company-wide",
    body: "Overall wellbeing has held steady around **72/100** the last three days, with resilience trending **+4 points** over the past two weeks.\n\n**Marketing** shows the strongest week (+6), likely tied to the campaign wrap-up. **Engineering** stayed flat with a slight Sunday dip — worth keeping an eye on, but no alert yet.\n\nThemes mentioned most: Workload (31%), Team (21%), Motivation (17%).",
  },
  {
    id: "pulse-2",
    date: daysAgo(6),
    type: "pulse",
    title: "3-day pulse · Company-wide",
    body: "A quiet stretch. Wellbeing **68→71**, recovery ratio **74%**. People are bouncing back from dips reliably — a strong sign of cultural resilience.\n\nTwo small signals to note: emotional bandwidth in **Sales** widened slightly (volatility ↑), and **Customer Success** had the highest positive Team mentions this cycle.",
  },
];
