import { getTopicClusters, type DepartmentKey } from "@/lib/corporateFakeData";

interface Props { dept: DepartmentKey | "all"; }

const COLORS = ["#9B6FD4", "#7BA8FF", "#86EFAC", "#FBBF24", "#F472B6"];

const TopicClusters = ({ dept }: Props) => {
  const data = getTopicClusters(dept);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-foreground font-semibold">Topic Clusters</h3>
        <span className="text-[11px] text-muted-foreground">AI-aggregated · anonymous</span>
      </div>
      <div className="space-y-2.5">
        {data.map((t, i) => (
          <div key={t.key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground/85">{t.label}</span>
              <span className="text-muted-foreground">{t.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-4 leading-snug">
        Topics are inferred from journal entries by AI. No words, phrases, or individuals are exposed — only category proportions across the group.
      </p>
    </div>
  );
};

export default TopicClusters;
