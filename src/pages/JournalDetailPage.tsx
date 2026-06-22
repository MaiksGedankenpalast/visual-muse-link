import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CORE_LABEL_KEYS = ["Stimmung", "Energie", "Entspannung"];
const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface Entry {
  id: string; title: string; content: string | null; category: string;
  date: string; mood_snapshot: number | null; created_at: string;
}

interface MoodDay {
  stimmung: number; energie: number; stress: number;
  tags: string[] | null;
}

const JournalDetailPage = () => {
  const { t, i18n } = useTranslation();
  const isEN = i18n.language === "en";
  const WEEKDAYS = isEN ? WEEKDAYS_EN : WEEKDAYS_DE;
  const MONTHS = isEN ? MONTHS_EN : MONTHS_DE;
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entry, setEntry] = useState<Entry | null>(null);
  const [mood, setMood] = useState<MoodDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await supabase.from("journal_entries").select("*").eq("id", id).single();
      if (data) {
        setEntry(data as Entry);
        setEditTitle(data.title);
        setEditContent(data.content ?? "");
        // fetch mood for that date
        const { data: moodData } = await supabase.from("mood_entries")
          .select("stimmung, energie, stress, tags")
          .eq("user_id", user.id).eq("date", data.date)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (moodData) setMood(moodData as unknown as MoodDay);
      }
      setLoading(false);
    })();
  }, [user, id]);

  const handleDelete = async () => {
    if (!id) return;
    await supabase.from("journal_entries").delete().eq("id", id);
    toast({ title: t("Eintrag gelöscht") });
    navigate("/journal");
  };

  const handleSave = async () => {
    if (!id || !editTitle.trim()) return;
    await supabase.from("journal_entries").update({
      title: editTitle.trim(), content: editContent.trim() || null,
    }).eq("id", id);
    setEntry((prev) => prev ? { ...prev, title: editTitle.trim(), content: editContent.trim() || null } : prev);
    setEditing(false);
    toast({ title: t("Gespeichert 💜") });
  };

  if (loading) return (
    <div className="px-4 pt-6 pb-32 min-h-screen">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-6 w-32 mb-6" />
      <Skeleton className="h-40 rounded-[16px]" />
    </div>
  );

  if (!entry) return (
    <div className="px-4 pt-6 pb-32 min-h-screen text-center">
      <p className="text-muted-foreground mt-20">{t("Eintrag nicht gefunden.")}</p>
      <button onClick={() => navigate("/journal")} className="mt-4 text-sm" style={{ color: "var(--mindark-accent-start)" }}>{t("Zurück")}</button>
    </div>
  );

  const d = new Date(entry.date);
  const dateStr = isEN
    ? `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const moodTag = mood?.tags?.[0] ?? null;
  const moodAvg = mood ? (mood.stimmung + mood.energie + mood.stress) / 3 : null;
  // higher = better in new schema
  const moodColorDot = moodAvg === null ? "#9B6FD4" : moodAvg > 60 ? "#4ade80" : moodAvg < 40 ? "#ef4444" : "#9B6FD4";
  const moodValues = mood ? [mood.stimmung, mood.energie, mood.stress] : null;

  return (
    <div className="px-4 pt-6 pb-32 onboarding-slide min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate("/journal")}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="text-sm text-muted-foreground">{t("Abbrechen")}</button>
              <button onClick={handleSave} className="text-sm font-medium" style={{ color: "var(--mindark-accent-start)" }}>{t("Speichern")}</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}><Pencil className="w-5 h-5 text-muted-foreground" /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button><Trash2 className="w-5 h-5 text-muted-foreground" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent style={{ background: "var(--mindark-bg)", borderColor: "var(--mindark-card-border)" }}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">{t("Eintrag löschen?")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("Das kann nicht rückgängig gemacht werden.")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-foreground">{t("Abbrechen")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("Löschen")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* DATE + MOOD BADGE */}
      <p className="text-[13px] text-muted-foreground mb-2">{dateStr}</p>
      <div className="flex items-center gap-2 mb-3">
        {moodTag && (
          <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: moodColorDot }} />
            {t(moodTag)}
          </span>
        )}
        <span className="text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(139,92,246,0.2)", color: "var(--mindark-accent-start)" }}>
          {t(entry.category)}
        </span>
      </div>

      {/* TITLE */}
      {editing ? (
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-[24px] font-bold text-foreground bg-transparent outline-none mb-4" />
      ) : (
        <h1 className="text-[24px] font-bold text-foreground mb-4">{entry.title}</h1>
      )}

      {/* DIVIDER */}
      <div className="w-full h-px mb-5" style={{ background: "rgba(255,255,255,0.1)" }} />

      {/* CONTENT */}
      {editing ? (
        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[200px] text-[16px] text-foreground leading-relaxed resize-none outline-none bg-transparent" />
      ) : (
        <p className="text-foreground text-[16px] leading-relaxed whitespace-pre-wrap">
          {entry.content || t("Kein Inhalt.")}
        </p>
      )}

      {/* MOOD CAPSULES */}
      {moodValues && (
        <div className="mt-8">
          <p className="text-[13px] text-muted-foreground mb-3">{t("Mood an diesem Tag")}</p>
          <div className="flex justify-between gap-2">
            {moodValues.map((val, i) => {
              const pct = val;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className="relative w-full rounded-full overflow-hidden"
                    style={{ height: 80, background: "rgba(255,255,255,0.08)", borderRadius: 20 }}>
                    <div className="absolute bottom-0 left-0 right-0 gradient-primary flex items-center justify-center"
                      style={{ height: `${pct}%`, borderRadius: "0 0 20px 20px" }}>
                      <span className="text-foreground font-bold text-[10px]">{pct}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 text-center">{t(CORE_LABEL_KEYS[i])}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalDetailPage;
