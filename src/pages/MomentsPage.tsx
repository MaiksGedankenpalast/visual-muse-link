import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Image as ImageIcon, X, Trash2, ArrowLeft, Sparkles, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Arkie from "@/components/Arkie";
import { compressImage } from "@/lib/imageCompress";
import { getDailyMomentPrompt } from "@/lib/momentPrompts";
import { toast } from "@/hooks/use-toast";

interface Moment {
  id: string;
  photo_url: string;
  caption: string | null;
  prompt_used: string | null;
  date: string;
  created_at: string;
  storage_path?: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const germanDate = () => {
  const d = new Date();
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * Extrahiert den Storage-Pfad ({user_id}/file.jpg) aus einer signed URL
 * oder behandelt einen direkten Pfad.
 */
function pathFromUrl(url: string, userId: string): string | null {
  try {
    const m = url.match(/moment-photos\/([^?]+)/);
    if (m) return m[1];
  } catch { /* ignore */ }
  if (url.startsWith(`${userId}/`)) return url;
  return null;
}

const MomentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [todayMoment, setTodayMoment] = useState<Moment | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [permissionAsk, setPermissionAsk] = useState(false);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const dailyPrompt = getDailyMomentPrompt();

  /** Erzeugt signed URLs für alle moments. */
  const hydrateUrls = useCallback(async (rows: Moment[]): Promise<Moment[]> => {
    if (!user || rows.length === 0) return rows;
    return Promise.all(
      rows.map(async (m) => {
        const path = pathFromUrl(m.photo_url, user.id);
        if (!path) return m;
        const { data } = await supabase.storage
          .from("moment-photos")
          .createSignedUrl(path, 60 * 60);
        return { ...m, photo_url: data?.signedUrl ?? m.photo_url, storage_path: path };
      }),
    );
  }, [user]);

  const fetchMoments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("moments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Moment[];
    const hydrated = await hydrateUrls(rows);
    setMoments(hydrated);
    const t = hydrated.find((m) => m.date === todayStr());
    setTodayMoment(t ?? null);
    setLoading(false);
  }, [user, hydrateUrls]);

  useEffect(() => { fetchMoments(); }, [fetchMoments]);

  /** Workflow: User tippt auf großen Aufnahme-Button. */
  const onPrimaryCapture = () => {
    // Browser-Permission-API gibt für „camera" oft "prompt" zurück → wir zeigen einmalig Arkie-Sheet.
    const askedBefore = typeof window !== "undefined" && window.localStorage.getItem("mindark.cameraAsked") === "1";
    if (!askedBefore) {
      setPermissionAsk(true);
    } else {
      setPickerOpen(true);
    }
  };

  const allowCamera = () => {
    if (typeof window !== "undefined") window.localStorage.setItem("mindark.cameraAsked", "1");
    setPermissionAsk(false);
    // Direkt Kamera öffnen
    setTimeout(() => cameraInputRef.current?.click(), 50);
  };

  const chooseFromGalleryFromAsk = () => {
    if (typeof window !== "undefined") window.localStorage.setItem("mindark.cameraAsked", "1");
    setPermissionAsk(false);
    setTimeout(() => galleryInputRef.current?.click(), 50);
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      setUploading(true);
      const blob = await compressImage(file);
      setPreviewBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e) {
      toast({
        title: "Ups, das hat nicht geklappt.",
        description: "Versuch es nochmal? Arkie wartet. 💜",
      });
    } finally {
      setUploading(false);
    }
  };

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
    setCaption("");
  };

  const saveMoment = async () => {
    if (!user || !previewBlob) return;
    setUploading(true);
    try {
      const today = todayStr();
      const filename = `${today}_${Date.now()}.jpg`;
      const path = `${user.id}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from("moment-photos")
        .upload(path, previewBlob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("moments").insert({
        user_id: user.id,
        photo_url: path,
        caption: caption.trim() || null,
        prompt_used: dailyPrompt,
        date: today,
      });
      if (insErr) throw insErr;

      cancelPreview();
      await fetchMoments();
      toast({ title: "Moment gespeichert 💜" });
    } catch (e) {
      toast({
        title: "Ups, das hat nicht geklappt.",
        description: "Versuch es nochmal? Arkie wartet. 💜",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteMoment = async (id: string) => {
    if (!user) return;
    const m = moments.find((x) => x.id === id);
    if (!m) return;
    const path = m.storage_path ?? pathFromUrl(m.photo_url, user.id);
    if (path) {
      await supabase.storage.from("moment-photos").remove([path]);
    }
    await supabase.from("moments").delete().eq("id", id);
    setMoments((prev) => prev.filter((x) => x.id !== id));
    if (todayMoment?.id === id) setTodayMoment(null);
    setFullscreenId(null);
    setConfirmDelete(null);
    toast({ title: "Moment gelöscht" });
  };

  const fullscreenMoment = fullscreenId ? moments.find((m) => m.id === fullscreenId) ?? null : null;

  return (
    <div className="px-4 pt-6 pb-32 min-h-screen onboarding-slide">
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* HEADER */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-foreground font-bold text-[22px]">Deine Glücksmomente</h1>
          <p className="text-xs text-muted-foreground mt-1">{germanDate()}</p>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#C084FC)" }}
        >
          Premium ✨
        </span>
      </div>

      {/* ARKIE PROMPT CARD */}
      <div
        className="rounded-[20px] p-[18px] mb-5 flex gap-3 items-start"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.45), rgba(192,132,252,0.25))" }}
      >
        <div className="shrink-0">
          <Arkie size="small" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Arkies Moment-Frage
          </p>
          <p className="text-foreground text-[16px] italic leading-snug">{dailyPrompt}</p>
          <p className="text-[11px] text-muted-foreground text-right mt-1.5">{germanDate()}</p>
        </div>
      </div>

      {/* PREVIEW (vor dem Speichern) */}
      {previewUrl ? (
        <div className="mb-6">
          <div className="relative w-full overflow-hidden rounded-[20px]" style={{ height: 250 }}>
            <img src={previewUrl} alt="Vorschau" className="w-full h-full object-cover" />
            <button
              onClick={cancelPreview}
              aria-label="Vorschau verwerfen"
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Was war das für ein Moment?"
            rows={3}
            className="w-full mt-3 rounded-[14px] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <button
            onClick={saveMoment}
            disabled={uploading}
            className="w-full mt-3 py-3 rounded-full font-bold text-foreground disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#C084FC)" }}
          >
            {uploading ? "Arkie speichert deinen Moment... 💜" : "Speichern"}
          </button>
        </div>
      ) : (
        /* CAPTURE BUTTON */
        <div className="mb-6 flex flex-col items-center">
          {todayMoment ? (
            <button
              onClick={onPrimaryCapture}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm text-foreground"
              style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.5)" }}
            >
              <Plus className="w-4 h-4" /> Foto hinzufügen
            </button>
          ) : (
            <>
              <button
                onClick={onPrimaryCapture}
                aria-label="Moment festhalten"
                className="w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{
                  background: "linear-gradient(135deg,#8B5CF6,#C084FC)",
                  boxShadow: "0 0 28px rgba(180,127,232,0.45)",
                }}
              >
                <Camera className="w-9 h-9 text-white" />
              </button>
              <p className="text-foreground text-sm mt-3">Moment festhalten</p>
            </>
          )}
        </div>
      )}

      {/* UPLOAD LOADING OVERLAY */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: "rgba(13,11,20,0.85)" }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Arkie size="large" />
          </motion.div>
          <p className="text-foreground mt-4 text-sm">Arkie speichert deinen Moment... 💜</p>
        </div>
      )}

      {/* MOMENTS GRID */}
      <div>
        <p className="font-bold text-foreground text-[16px] mb-3">Deine Momente</p>
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-square rounded-[12px]" />)}
          </div>
        ) : moments.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center">
            <Arkie size="medium" />
            <p className="text-muted-foreground text-sm mt-4 max-w-[260px]">
              Dein erster Moment wartet. Was macht heute deinen Tag besonders? 💜
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {moments.map((m) => (
              <button
                key={m.id}
                onClick={() => setFullscreenId(m.id)}
                className="aspect-square rounded-[12px] overflow-hidden relative"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <img src={m.photo_url} alt={m.caption ?? "Moment"} loading="lazy" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PERMISSION ASK SHEET */}
      <Sheet open={permissionAsk} onOpenChange={setPermissionAsk}>
        <SheetContent side="bottom" className="bg-[#0D0B14] border-t border-white/10 rounded-t-[24px]">
          <SheetHeader>
            <SheetTitle className="text-foreground text-left">Darf Arkie deine Kamera nutzen? 📸</SheetTitle>
            <SheetDescription className="text-left">
              Nur um deine Glücksmomente festzuhalten — nichts wird ohne dein Wissen gespeichert.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-5">
            <button
              onClick={allowCamera}
              className="w-full py-3 rounded-full font-bold text-foreground"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#C084FC)" }}
            >
              Ja, Kamera erlauben
            </button>
            <button
              onClick={chooseFromGalleryFromAsk}
              className="w-full py-3 rounded-full text-sm text-foreground"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              Aus Galerie wählen
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* SOURCE PICKER SHEET */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="bg-[#0D0B14] border-t border-white/10 rounded-t-[24px]">
          <SheetHeader>
            <SheetTitle className="text-foreground text-left">Moment hinzufügen</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-5">
            <button
              onClick={() => { setPickerOpen(false); setTimeout(() => cameraInputRef.current?.click(), 50); }}
              className="w-full py-3 rounded-full font-medium text-foreground flex items-center justify-center gap-2"
              style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.4)" }}
            >
              <Camera className="w-4 h-4" /> Foto aufnehmen
            </button>
            <button
              onClick={() => { setPickerOpen(false); setTimeout(() => galleryInputRef.current?.click(), 50); }}
              className="w-full py-3 rounded-full font-medium text-foreground flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <ImageIcon className="w-4 h-4" /> Aus Galerie wählen
            </button>
            <button
              onClick={() => setPickerOpen(false)}
              className="w-full py-3 text-sm text-muted-foreground"
            >
              Abbrechen
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* FULLSCREEN MOMENT */}
      <AnimatePresence>
        {fullscreenMoment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <img
              src={fullscreenMoment.photo_url}
              alt={fullscreenMoment.caption ?? "Moment"}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-x-0 bottom-0 pt-24 pb-8 px-5"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
            >
              <p className="text-[12px] text-white/60">{formatDate(fullscreenMoment.date)}</p>
              {fullscreenMoment.caption && (
                <p className="text-white text-[16px] mt-1.5">{fullscreenMoment.caption}</p>
              )}
              {fullscreenMoment.prompt_used && (
                <p className="text-[13px] italic text-white/55 mt-2 leading-snug">
                  „{fullscreenMoment.prompt_used}"
                </p>
              )}
            </div>
            <button
              onClick={() => setFullscreenId(null)}
              aria-label="Zurück"
              className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.85)" }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setConfirmDelete(fullscreenMoment.id)}
              aria-label="Löschen"
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent style={{ background: "#0D0B14", borderColor: "rgba(255,255,255,0.1)" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Moment löschen?</AlertDialogTitle>
            <AlertDialogDescription>Das kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-foreground">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMoment(confirmDelete)}
              className="bg-destructive text-destructive-foreground"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MomentsPage;