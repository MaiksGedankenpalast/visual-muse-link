import { getSundayIndex } from "@/lib/corporateFakeData";

const SundayIndex = () => {
  const data = getSundayIndex();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-foreground font-semibold">Sunday Index</h3>
        <span className="text-[11px] text-muted-foreground">Sun→Mon mood delta · 8 weeks</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Negative values mean people start the week worse than they ended the weekend — a strong early signal for workload pressure.
      </p>
      <div className="space-y-2">
        {data.map((row) => (
          <div key={row.dept} className="grid grid-cols-[140px_1fr_50px] items-center gap-3">
            <span className="text-xs text-muted-foreground truncate">{row.name}</span>
            <div className="grid grid-cols-8 gap-1">
              {row.weekly.map((v, i) => {
                const intensity = Math.min(Math.abs(v) / 12, 1);
                const bg = v < 0
                  ? `rgba(248, 113, 113, ${0.2 + intensity * 0.7})`
                  : `rgba(134, 239, 172, ${0.2 + intensity * 0.7})`;
                return <div key={i} className="h-6 rounded" style={{ background: bg }} title={`Week -${8 - i}: ${v}`} />;
              })}
            </div>
            <span className={`text-xs text-right ${row.avg < 0 ? "text-rose-300" : "text-emerald-300"}`}>
              {row.avg > 0 ? "+" : ""}{row.avg.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SundayIndex;
