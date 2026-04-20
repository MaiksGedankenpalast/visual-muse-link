import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addUserChallenge } from "@/lib/userChallenges";

interface ChallengeOption {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
}

interface AddChallengeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}

const AddChallengeSheet = ({ open, onOpenChange, onAdded }: AddChallengeSheetProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<ChallengeOption[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      const [{ data: chData }, { data: ucData }] = await Promise.all([
        supabase.from("challenges").select("id,title,description,category,icon").or(`is_preset.eq.true,user_id.eq.${user.id}`),
        supabase.from("user_challenges").select("challenge_id").eq("user_id", user.id).eq("is_active", true),
      ]);
      setAll((chData ?? []) as ChallengeOption[]);
      setActiveIds(new Set((ucData ?? []).map((r: any) => r.challenge_id)));
      setLoading(false);
    })();
  }, [open, user]);

  const handleAdd = async (id: string) => {
    if (!user || activeIds.has(id)) return;
    setActiveIds((prev) => new Set(prev).add(id));
    await addUserChallenge(user.id, id);
    onAdded?.();
    onOpenChange(false);
  };

  const filtered = all.filter((c) =>
    query.trim().length === 0
      ? true
      : c.title.toLowerCase().includes(query.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="h-[85vh] flex flex-col"
        style={{ background: "var(--mindark-bg)", borderColor: "var(--mindark-card-border)" }}
      >
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-foreground">Challenge hinzufügen</DrawerTitle>
          <DrawerClose asChild>
            <button className="text-muted-foreground">✕</button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 scrollbar-hide">
          {loading ? (
            <>
              <Skeleton className="h-16 rounded-[14px]" />
              <Skeleton className="h-16 rounded-[14px]" />
              <Skeleton className="h-16 rounded-[14px]" />
            </>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Keine Challenges gefunden.
            </p>
          ) : (
            filtered.map((ch) => {
              const already = activeIds.has(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => handleAdd(ch.id)}
                  disabled={already}
                  className="w-full text-left glass-card p-3 flex items-start gap-3 transition-opacity"
                  style={{ opacity: already ? 0.55 : 1 }}
                >
                  <span className="text-[24px] leading-none shrink-0">{ch.icon || "✨"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-[14px]">{ch.title}</p>
                    {ch.description && (
                      <p className="text-muted-foreground text-[12px] line-clamp-2 mt-0.5">
                        {ch.description}
                      </p>
                    )}
                    {ch.category && (
                      <span
                        className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                      >
                        {ch.category}
                      </span>
                    )}
                  </div>
                  {already && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--mindark-accent-start)" }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AddChallengeSheet;
