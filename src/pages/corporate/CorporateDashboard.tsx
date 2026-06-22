import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  COMPANY_NAME,
  TOTAL_HEADCOUNT,
  DEPARTMENTS,
  getKpis,
  getWorkloadPressure,
  getEmotionalBandwidth,
  type DepartmentKey,
} from "@/lib/corporateFakeData";
import KpiCard from "@/components/corporate/KpiCard";
import BurnoutHeatmap from "@/components/corporate/BurnoutHeatmap";
import SundayIndex from "@/components/corporate/SundayIndex";
import TopicClusters from "@/components/corporate/TopicClusters";
import PulseArkieFeed from "@/components/corporate/PulseArkieFeed";
import LeadershipArkieChat from "@/components/corporate/LeadershipArkieChat";

const CorporateDashboard = () => {
  const navigate = useNavigate();
  const [dept, setDept] = useState<DepartmentKey | "all">("all");

  useEffect(() => {
    if (localStorage.getItem("dashboardUnlocked") !== "1") {
      navigate("/corporate/login", { replace: true });
    }
  }, [navigate]);

  const k = getKpis(dept);
  const workload = getWorkloadPressure();
  const bandwidth = getEmotionalBandwidth();

  const signOut = () => {
    localStorage.removeItem("dashboardUnlocked");
    navigate("/splash");
  };

  return (
    <div className="min-h-screen bg-[#0D0B14] text-foreground">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0D0B14]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-sm font-bold">N</div>
            <div>
              <h1 className="font-semibold tracking-tight">{COMPANY_NAME}</h1>
              <p className="text-[11px] text-muted-foreground">{TOTAL_HEADCOUNT} employees · MindArk for Corporate · Demo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              Anonymized · k ≥ 5
            </span>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as DepartmentKey | "all")}
              className="h-9 rounded-lg bg-white/[0.06] border border-white/10 px-3 text-sm outline-none"
            >
              <option value="all">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.key} value={d.key}>{d.name} ({d.headcount})</option>
              ))}
            </select>
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Row */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Key Indicators · last 2 weeks</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Wellbeing Score" value={k.wellbeing.current} suffix="/100" delta={k.wellbeing.delta} trend={k.wellbeing.trend} tone="good" help="Composite of mood, energy, stress (inverted)." />
            <KpiCard label="Resilience" value={k.resilience.current} suffix="/100" trend={k.resilience.trend} help="Recovery speed after mood dips." />
            <KpiCard label="Recovery Ratio" value={k.recovery.current} suffix="%" trend={k.recovery.trend} help="Share of dips followed by an uptick." />
            <KpiCard label="Engagement" value={k.engagement.current} suffix="/100" trend={k.engagement.trend} help="App usage consistency." />
            <KpiCard label="Burnout Risk" value={k.burnout.current} suffix="/100" tone={k.burnout.current > 60 ? "warn" : "default"} help="Workload × low-mood composite." />
          </div>
        </section>

        {/* Early Warning */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Early Warning</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <SundayIndex />
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-foreground font-semibold mb-1">Workload Pressure</h3>
              <p className="text-xs text-muted-foreground mb-4">
                % perceived workload per department. Lower is healthier — high pressure is the risk signal, not low pressure.
              </p>
              <div className="space-y-2.5">
                {workload.map((w) => {
                  const last = w.weekly[w.weekly.length - 1];
                  const status =
                    last > 75
                      ? { tone: "bg-rose-400", label: "Overloaded", color: "text-rose-300" }
                      : last > 60
                      ? { tone: "bg-amber-400", label: "Elevated", color: "text-amber-300" }
                      : last > 40
                      ? { tone: "bg-emerald-400", label: "Healthy range", color: "text-emerald-300" }
                      : { tone: "bg-emerald-400/80", label: "Comfortable · sustainable pace", color: "text-emerald-300" };
                  return (
                    <div key={w.dept}>
                      <div className="flex justify-between text-xs mb-1 items-baseline">
                        <span className="text-foreground/85">{w.name}</span>
                        <span className="flex items-baseline gap-2">
                          <span className={`text-[10px] ${status.color}`}>{status.label}</span>
                          <span className="text-muted-foreground tabular-nums">{last}%</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full ${status.tone}`} style={{ width: `${last}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground leading-relaxed">
                Goal isn't 100% — it's a sustainable 45–60% range. Low values mean teams have recovery headroom, which protects long-term performance.
              </p>
            </div>
          </div>
        </section>

        {/* Heatmap + Bandwidth + Topics */}
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <BurnoutHeatmap />
          </div>
          <TopicClusters dept={dept} />
        </section>

        <section>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="text-foreground font-semibold mb-1">Emotional Bandwidth</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Mood volatility per department (σ, weekly). Low = stable. High = swings — both apathy and chaos look similar from outside, so this is an early signal, not a verdict.
            </p>
            <div className="space-y-1.5">
              {bandwidth.map((row) => {
                const avg = Math.round(row.weekly.reduce((a, b) => a + b, 0) / row.weekly.length);
                return (
                  <div key={row.dept} className="grid grid-cols-[130px_1fr_44px] items-center gap-3">
                    <span className="text-xs text-muted-foreground truncate">{row.name}</span>
                    <div className="grid grid-cols-12 gap-1">
                      {row.weekly.map((v, i) => {
                        let bg: string;
                        let fg: string;
                        if (v >= 12) { bg = "rgba(244, 114, 182, 0.85)"; fg = "text-white"; }
                        else if (v >= 8) { bg = "rgba(168, 85, 247, 0.7)"; fg = "text-white"; }
                        else if (v >= 5) { bg = "rgba(99, 102, 241, 0.55)"; fg = "text-indigo-50"; }
                        else { bg = "rgba(56, 189, 248, 0.4)"; fg = "text-sky-50"; }
                        return (
                          <div
                            key={i}
                            className={`h-7 rounded flex items-center justify-center text-[10px] font-semibold tabular-nums ${fg}`}
                            style={{ background: bg }}
                            title={`Week ${i + 1}: σ≈${v}`}
                          >
                            {v}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-xs tabular-nums text-foreground/80 text-right">⌀{avg}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded text-sky-50" style={{ background: "rgba(56, 189, 248, 0.4)" }}>&lt;5 Stable</span>
              <span className="px-2 py-0.5 rounded text-indigo-50" style={{ background: "rgba(99, 102, 241, 0.55)" }}>5–7 Normal</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ background: "rgba(168, 85, 247, 0.7)" }}>8–11 Elevated swings</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ background: "rgba(244, 114, 182, 0.85)" }}>12+ Volatile</span>
            </div>
          </div>
        </section>

        {/* Arkie */}
        <section className="grid lg:grid-cols-2 gap-4">
          <PulseArkieFeed />
          <LeadershipArkieChat dept={dept} />
        </section>

        <footer className="text-center text-[11px] text-muted-foreground py-6 leading-relaxed">
          All numbers in this dashboard are aggregated across ≥5 people per signal. Individual data — names, journals, chat content, single-day mood lines — is never accessible to leadership. Powered by MindArk · Demo data for Northwind Labs.
        </footer>
      </main>
    </div>
  );
};

export default CorporateDashboard;
