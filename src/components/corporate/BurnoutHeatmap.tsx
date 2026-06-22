import { getBurnoutHeatmap } from "@/lib/corporateFakeData";

function band(v: number) {
  if (v >= 70) return { bg: "rgba(244, 63, 94, 0.85)", fg: "text-white", label: "High" };
  if (v >= 55) return { bg: "rgba(251, 146, 60, 0.75)", fg: "text-white", label: "Elevated" };
  if (v >= 40) return { bg: "rgba(250, 204, 21, 0.5)", fg: "text-amber-950", label: "Moderate" };
  return { bg: "rgba(74, 222, 128, 0.4)", fg: "text-emerald-50", label: "Healthy" };
}

const BurnoutHeatmap = () => {
  const data = getBurnoutHeatmap();
  const rowAvg = (w: number[]) => Math.round(w.reduce((a, b) => a + b, 0) / w.length);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-foreground font-semibold">Burnout Heatmap</h3>
        <span className="text-[11px] text-muted-foreground">12 weeks · score 0–100</span>
      </div>
      <div className="space-y-1.5">
        {data.map((row) => (
          <div key={row.dept} className="grid grid-cols-[130px_1fr_44px] items-center gap-3">
            <span className="text-xs text-muted-foreground truncate">{row.name}</span>
            <div className="grid grid-cols-12 gap-1">
              {row.weekly.map((v, i) => {
                const b = band(v);
                return (
                  <div
                    key={i}
                    title={`Week ${i + 1}: ${v} · ${b.label}`}
                    className={`h-7 rounded flex items-center justify-center text-[10px] font-semibold tabular-nums ${b.fg}`}
                    style={{ background: b.bg }}
                  >
                    {v}
                  </div>
                );
              })}
            </div>
            <span className="text-xs tabular-nums text-foreground/80 text-right">⌀{rowAvg(row.weekly)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="px-2 py-0.5 rounded text-emerald-50" style={{ background: "rgba(74, 222, 128, 0.4)" }}>0–39 Healthy</span>
        <span className="px-2 py-0.5 rounded text-amber-950" style={{ background: "rgba(250, 204, 21, 0.5)" }}>40–54 Moderate</span>
        <span className="px-2 py-0.5 rounded text-white" style={{ background: "rgba(251, 146, 60, 0.75)" }}>55–69 Elevated</span>
        <span className="px-2 py-0.5 rounded text-white" style={{ background: "rgba(244, 63, 94, 0.85)" }}>70+ High</span>
      </div>
    </div>
  );
};

export default BurnoutHeatmap;
