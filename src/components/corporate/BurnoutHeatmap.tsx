import { getBurnoutHeatmap } from "@/lib/corporateFakeData";

function color(v: number) {
  // 0 (green) -> 100 (red)
  const h = Math.round(140 - (v / 100) * 140);
  const s = 60;
  const l = 38;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const BurnoutHeatmap = () => {
  const data = getBurnoutHeatmap();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-foreground font-semibold">Burnout Heatmap</h3>
        <span className="text-[11px] text-muted-foreground">12 weeks · weekly score</span>
      </div>
      <div className="space-y-1.5">
        {data.map((row) => (
          <div key={row.dept} className="grid grid-cols-[140px_1fr] items-center gap-3">
            <span className="text-xs text-muted-foreground truncate">{row.name}</span>
            <div className="grid grid-cols-12 gap-1">
              {row.weekly.map((v, i) => (
                <div
                  key={i}
                  title={`Week ${i + 1}: ${v}`}
                  className="h-6 rounded"
                  style={{ background: color(v) }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Low</span>
        <div className="h-2 flex-1 rounded" style={{ background: "linear-gradient(90deg, hsl(140,60%,38%), hsl(70,60%,38%), hsl(0,60%,38%))" }} />
        <span>High</span>
      </div>
    </div>
  );
};

export default BurnoutHeatmap;
