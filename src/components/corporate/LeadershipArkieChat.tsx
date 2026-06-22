import { useState, useRef, useEffect } from "react";
import { COMPANY_NAME, DEPARTMENTS, getKpis, getTopicClusters, getSundayIndex, type DepartmentKey } from "@/lib/corporateFakeData";

const STORAGE = "leadershipArkieChat";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface Msg { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "How is Sales doing right now?",
  "What should I address in Monday's all-hands?",
  "How do I bring up workload without singling anyone out?",
];

function buildContextSnapshot(dept: DepartmentKey | "all") {
  const k = getKpis(dept);
  const topics = getTopicClusters(dept);
  const sunday = getSundayIndex();
  const deptName = dept === "all" ? "Company-wide" : DEPARTMENTS.find(d => d.key === dept)?.name;
  const topicLine = topics.map(t => `${t.label} ${t.pct}%`).join(", ");
  const sundayLine = sunday.map(s => `${s.name}: ${s.avg.toFixed(1)}`).join(" | ");
  return `DASHBOARD SNAPSHOT (k≥5 anonymized aggregates) — Company: ${COMPANY_NAME}
Filter: ${deptName}
Wellbeing Score: ${k.wellbeing.current}/100 (Δ ${k.wellbeing.delta} vs prev 2w)
Resilience: ${k.resilience.current}/100
Recovery Ratio: ${k.recovery.current}%
Engagement Consistency: ${k.engagement.current}/100
Burnout Risk: ${k.burnout.current}/100
Topic mix: ${topicLine}
Sunday Index per dept (Sun→Mon delta): ${sundayLine}`;
}

interface Props { dept: DepartmentKey | "all"; }

const LeadershipArkieChat = ({ dept }: Props) => {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/arkie-leadership`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({
          messages: newMsgs,
          dashboardContext: buildContextSnapshot(dept),
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, no response.";
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([...newMsgs, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setMessages([]); localStorage.removeItem(STORAGE); };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col h-[560px]">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-foreground font-semibold">Leadership Arkie</h3>
        <button onClick={clear} className="text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Your private AI coach. Trained on this dashboard — never on individual employee chats.
      </p>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="block w-full text-left px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-foreground/85 hover:bg-white/[0.07]">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm leading-relaxed ${m.role === "user" ? "text-foreground" : "text-foreground/85"}`}>
            <div className={`inline-block max-w-[90%] px-3 py-2 rounded-xl ${
              m.role === "user" ? "bg-accent/20 border border-accent/30 ml-auto" : "bg-white/[0.05] border border-white/10"
            }`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground">Arkie is thinking…</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your team…"
          className="flex-1 h-10 rounded-lg bg-white/[0.06] border border-white/10 px-3 text-sm text-foreground outline-none focus:border-accent"
        />
        <button type="submit" disabled={loading || !input.trim()} className="px-4 h-10 rounded-lg gradient-primary text-foreground text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
};

export default LeadershipArkieChat;
