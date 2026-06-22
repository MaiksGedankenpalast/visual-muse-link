import { PULSE_LETTERS } from "@/lib/corporateFakeData";

const PulseArkieFeed = () => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-foreground font-semibold">Arkie Pulse Letters</h3>
        <span className="text-[11px] text-muted-foreground">Every 3 days + on signal</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Short anonymized briefings. Aggregated over ≥5 people per signal.
      </p>
      <div className="space-y-3">
        {PULSE_LETTERS.map((l) => (
          <article
            key={l.id}
            className={`rounded-xl border p-4 ${
              l.type === "alert"
                ? "border-rose-400/30 bg-rose-500/[0.08]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-baseline justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {l.type === "alert" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" />}
                {l.title}
              </h4>
              <span className="text-[11px] text-muted-foreground">{l.date}</span>
            </div>
            <div className="text-sm text-foreground/85 whitespace-pre-line leading-relaxed">
              {l.body.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
                seg.startsWith("**") && seg.endsWith("**") ? (
                  <strong key={i} className="text-foreground font-semibold">{seg.slice(2, -2)}</strong>
                ) : (
                  <span key={i}>{seg}</span>
                )
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default PulseArkieFeed;
