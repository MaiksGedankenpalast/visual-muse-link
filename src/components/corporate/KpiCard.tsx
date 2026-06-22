interface Props {
  label: string;
  value: number;
  suffix?: string;
  delta?: number;
  trend?: number[];
  tone?: "default" | "warn" | "good";
  help?: string;
}

const KpiCard = ({ label, value, suffix, delta, trend, tone = "default", help }: Props) => {
  const max = trend ? Math.max(...trend, 1) : 1;
  const min = trend ? Math.min(...trend, 0) : 0;
  const range = Math.max(max - min, 1);

  const path = trend
    ? trend
        .map((v, i) => {
          const x = (i / (trend.length - 1)) * 100;
          const y = 30 - ((v - min) / range) * 26;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ")
    : "";

  const stroke =
    tone === "warn" ? "rgb(248,113,113)" : tone === "good" ? "rgb(134,239,172)" : "rgb(199,158,240)";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-xs ${delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-foreground">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {trend && (
        <svg viewBox="0 0 100 32" className="w-full h-8 mt-2" preserveAspectRatio="none">
          <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
        </svg>
      )}
      {help && <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{help}</p>}
    </div>
  );
};

export default KpiCard;
