import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Arkie from "@/components/Arkie";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SLIDER_LABELS = ["Glücklich", "Ruhig", "Selbstsicher", "Aufgeregt", "Ausgeruht"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

interface JournalEntry {
  id: string;
  title: string;
  content: string | null;
  category: string;
  date: string;
  mood_snapshot: number | null;
  created_at: string;
}

interface MoodData {
  happy_sad: number;
  calm_anxious: number;
  confident_insecure: number;
  excited_bored: number;
  rested_tired: number;
  tags: string[] | null;
}

interface DayMoment {
  id: string;
  photo_url: string;
  signed_url?: string;
  caption: string | null;
  prompt_used: string | null;
}

const JournalDayPage = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mood, setMood] = useState<MoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dayMoment, setDayMoment] = useState<DayMoment | null>(null);

  useEffect(() => {
    if (!user || !date) return;
    (async () => {
      const [
        { data: entryData },
        { data: moodData },
        { data: momentData },
      ] = await Promise.all([
        supabase.from("journal_entries").select("*").eq("user_id", user.id).eq("date", date).order("created_at", { ascending: false }),
        supabase.from("mood_entries")
          .select("happy_sad, calm_anxious, confident_insecure, excited_bored, rested_tired, tags")
          .eq("user_id", user.id).eq("date", date).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase
          .from("moments")
          .select("id, photo_url, caption, prompt_used")
          .eq("user_id", user.id)
          .eq("date", date)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setEntries((entryData ?? []) as JournalEntry[]);
      if (moodData) setMood(moodData as MoodData);
      if (momentData) {
        const m = momentData as any;
        const path = (m.photo_url as string).startsWith(`${user.id}/`)
          ? (m.photo_url as string)
          : null;
        let signed = m.photo_url as string;
        if (path) {
          const { data: signedData } = await supabase.storage
            .from("moment-photos")
            .createSignedUrl(path, 60 * 60);
          if (signedData?.signedUrl) signed = signedData.signedUrl;
        }
        setDayMoment({
          id: m.id,
          photo_url: m.photo_url,
          signed_url: signed,
          caption: m.caption,
          prompt_used: m.prompt_used,
        });
      }
      setLoading(false);
    })();
  }, [user, date]);

  const d = date ? new Date(date + "T00:00:00") : new Date();
  const dateFormatted = `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;

  const moodValues = mood ? [mood.happy_sad, mood.calm_anxious, mood.confident_insecure, mood.excited_bored, mood.rested_tired] : null;

  const handleDelete = async (id: string) => {
    await supabase.from("journal_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setExpandedEntry(null);
    toast({ title: "Eintrag gelöscht" });
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditContent(entry.content ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editingId || !editTitle.trim()) return;
    await supabase.from("journal_entries").update({
      title: editTitle.trim(), content: editContent.trim() || null,
    }).eq("id", editingId);
    setEntries((prev) => prev.map((e) => e.id === editingId ? { ...e, title: editTitle.trim(), content: editContent.trim() || null } : e));
    setEditing(false);
    setEditingId(null);
    toast({ title: "Gespeichert 💜" });
  };

  if (loading) return (
    <div className="px-4 pt-6 pb-32 min-h-screen">
      <Skeleton className="h-6 w-40 mx-auto mb-6" />
      <div className="flex justify-between gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="flex-1 h-36 rounded-2xl" />)}
      </div>
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );

  // Expanded fullscreen entry view
  if (expandedEntry) {
    const entry = entries.find((e) => e.id === expandedEntry);
    if (!entry) { setExpandedEntry(null); return null; }
    const time = new Date(entry.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    if (editing && editingId === entry.id) {
      return (
        <div className="px-4 pt-6 pb-32 min-h-screen onboarding-slide">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => { setEditing(false); setEditingId(null); }}>
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <button onClick={handleSave} className="text-sm font-medium" style={{ color: "#A855F7" }}>Speichern</button>
          </div>
          <p className="text-[13px] text-muted-foreground mb-2">{dateFormatted} · {time}</p>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-[22px] font-bold text-foreground bg-transparent outline-none mb-4" />
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[300px] text-[16px] text-foreground leading-relaxed resize-none outline-none bg-transparent" />
        </div>
      );
    }

    return (
      <div className="px-4 pt-6 pb-32 min-h-screen onboarding-slide">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setExpandedEntry(null)}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <div className="flex gap-3">
            <button onClick={() => startEdit(entry)}><Pencil className="w-5 h-5 text-muted-foreground" /></button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button><Trash2 className="w-5 h-5 text-muted-foreground" /></button>
              </AlertDialogTrigger>
              <AlertDialogContent style={{ background: "#0D0B14", borderColor: "rgba(255,255,255,0.1)" }}>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Eintrag löschen?</AlertDialogTitle>
                  <AlertDialogDescription>Das kann nicht rückgängig gemacht werden.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-foreground">Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive text-destructive-foreground">Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground mb-1">{dateFormatted} · {time}</p>
        {mood?.tags && mood.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {mood.tags.map((t) => (
              <span key={t} className="text-[11px] px-2.5 py-1 rounded-full text-muted-foreground"
                style={{ background: "rgba(255,255,255,0.08)" }}>{t}</span>
            ))}
          </div>
        )}
        <h1 className="text-[22px] font-bold text-foreground mb-4">{entry.title}</h1>
        <p className="text-foreground text-[16px] leading-relaxed whitespace-pre-wrap">
          {entry.content || "Kein Inhalt."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-32 min-h-screen onboarding-slide">
      {/* HEADER */}
      <div className="flex items-center mb-6">
        <button onClick={() => navigate("/journal")}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.3)" }}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <p className="text-[14px] text-muted-foreground flex-1 text-center pr-10">{dateFormatted}</p>
      </div>

      {/* MOOD CAPSULES */}
      {moodValues ? (
        <div className="mb-6">
          <div className="flex justify-between gap-2">
            {moodValues.map((val, i) => {
              const pct = 100 - val;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className="relative w-full overflow-hidden"
                    style={{ height: 140, background: "rgba(255,255,255,0.06)", borderRadius: 24 }}>
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
                      style={{
                        height: `${pct}%`,
                        borderRadius: "0 0 24px 24px",
                        background: "linear-gradient(to top, #7B5EA7, #C084FC)",
                      }}>
                      <span className="text-foreground font-bold text-[13px]">{pct}%</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-2 text-center leading-tight">{SLIDER_LABELS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-center py-6">
          <div className="flex justify-between gap-2 mb-3">
            {SLIDER_LABELS.map((label, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="w-full flex items-center justify-center"
                  style={{ height: 140, background: "rgba(255,255,255,0.06)", borderRadius: 24 }}>
                  <span className="text-muted-foreground text-lg">—</span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-2 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-[12px]">Kein Mood an diesem Tag eingetragen</p>
        </div>
      )}

      {/* MOOD TAGS */}
      {mood?.tags && mood.tags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5">
          {mood.tags.map((t) => (
            <span key={t} className="text-[12px] px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 text-muted-foreground"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* ARKIE PROMPT CARD — only if there's a mood entry (we derive prompt from mood) */}
      {mood && entries.length > 0 && entries[0].mood_snapshot !== null && (
        <div className="rounded-2xl p-4 mb-6"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(192,132,252,0.25))" }}>
          <p className="text-[12px] text-center text-foreground opacity-70 mb-1">Arkies Frage</p>
          <p className="text-foreground text-[15px] text-center italic leading-snug">
            {entries[0].title}
          </p>
        </div>
      )}

      {/* JOURNAL ENTRIES */}
      {entries.length === 0 ? (
        <div className="text-center py-10">
          <Arkie size="medium" />
          <p className="text-muted-foreground text-sm mt-4">An diesem Tag wurde nichts geschrieben.</p>
          <button onClick={() => navigate("/journal/new", { state: { prefillDate: date } })}
            className="mt-4 btn-pill text-sm"
            style={{ height: 44, width: "auto", padding: "0 28px", display: "inline-flex" }}>
            + Eintrag für diesen Tag schreiben
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const time = new Date(entry.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
            return (
              <button key={entry.id} onClick={() => setExpandedEntry(entry.id)}
                className="w-full text-left">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[12px] text-muted-foreground">{time}</p>
                </div>
                <h2 className="font-bold text-foreground text-[18px] mb-1 flex items-center gap-2">
                  {entry.title}
                </h2>
                <p className="text-foreground text-[14px] leading-relaxed line-clamp-3 opacity-50">
                  {entry.content || "Kein Inhalt."}
                </p>
                <div className="w-full h-8 mt-1"
                  style={{ background: "linear-gradient(to bottom, transparent, rgba(13,11,20,0.9))" }} />
              </button>
            );
          })}
        </div>
      )}

      {/* GLÜCKSMOMENT FÜR DIESEN TAG */}
      {dayMoment && (
        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Dein Glücksmoment
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <img
              src={dayMoment.signed_url ?? dayMoment.photo_url}
              alt={dayMoment.caption ?? "Glücksmoment"}
              className="w-full object-cover"
              style={{ height: 200 }}
              loading="lazy"
            />
            {(dayMoment.caption || dayMoment.prompt_used) && (
              <div className="p-3 space-y-1.5">
                {dayMoment.caption && (
                  <p className="text-foreground text-[14px]">{dayMoment.caption}</p>
                )}
                {dayMoment.prompt_used && (
                  <p className="text-[12px] italic text-muted-foreground leading-snug">
                    „{dayMoment.prompt_used}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalDayPage;
