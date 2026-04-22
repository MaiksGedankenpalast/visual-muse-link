import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Arkie from "@/components/Arkie";
import { getOrCreateTreeProgress, phaseFromPoints, PHASE_RANGES, type TreeRow } from "@/lib/treeProgress";
import { haptic } from "@/lib/haptics";

import tree1 from "@/assets/tree-phase-1.png";
import tree2 from "@/assets/tree-phase-2.png";
import tree3 from "@/assets/tree-phase-3.png";
import tree4 from "@/assets/tree-phase-4.png";
import tree5 from "@/assets/tree-phase-5.png";
import moonImg from "@/assets/sanctuary-moon.png";

const TREE_ASSETS = [tree1, tree2, tree3, tree4, tree5];

// Floor height in viewport units — single source of truth for stacking
const FLOOR_VH = 22;

const SanctuaryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<TreeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [phaseGlow, setPhaseGlow] = useState(false);
  const prevPhaseRef = useRef<number | null>(null);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 120], [1, 0.6]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const r = await getOrCreateTreeProgress(user.id);
      setRow(r);
      if (r) prevPhaseRef.current = r.current_phase;
      setLoading(false);
    })();

    // Realtime to catch silent point updates from other screens
    const ch = supabase
      .channel("tree_progress_self")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tree_progress", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newRow = payload.new as TreeRow;
          setRow(newRow);
          if (prevPhaseRef.current !== null && newRow.current_phase > prevPhaseRef.current) {
            setPhaseGlow(true);
            setTimeout(() => setPhaseGlow(false), 2200);
          }
          prevPhaseRef.current = newRow.current_phase;
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const phase = row ? phaseFromPoints(row.points) : 1;
  const treeSrc = TREE_ASSETS[phase - 1];

  const handleSwipe = (_e: unknown, info: PanInfo) => {
    if (info.offset.x > 110 && Math.abs(info.offset.y) < 80) {
      haptic("selection");
      navigate("/insights");
    }
  };

  const handleWaterTree = () => {
    if (watering) return;
    haptic("tap");
    setWatering(true);
    setTimeout(() => setWatering(false), 1800);
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      onDragEnd={handleSwipe}
      style={{ x, opacity }}
      className="relative min-h-[100dvh] overflow-hidden select-none"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-6">
        <button
          onClick={() => navigate("/insights")}
          className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center"
          aria-label="Zurück"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-xs text-muted-foreground tracking-wider uppercase">Sanctuary</div>
        <div className="w-10" />
      </div>

      {/* Stage container */}
      <div className="relative w-full h-[100dvh] flex items-end justify-center">
        {/* Tree — verankert: Stängel beginnt leicht innerhalb der Moos-Ebene */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: "16vh" }}>
          {loading ? (
            <div className="w-[280px] h-[280px] rounded-full bg-white/5 animate-pulse" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={phase}
                initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
                transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative cursor-pointer"
                onClick={handleWaterTree}
              >
                {/* Glow halo */}
                <motion.div
                  className="absolute inset-0 -z-10 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)",
                    filter: "blur(40px)",
                  }}
                  animate={{
                    scale: phaseGlow ? [1, 1.5, 1.2] : [1, 1.08, 1],
                    opacity: phaseGlow ? [0.6, 1, 0.8] : [0.5, 0.75, 0.5],
                  }}
                  transition={{
                    duration: phaseGlow ? 2 : 4,
                    repeat: phaseGlow ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.img
                  src={treeSrc}
                  alt={`Baum Phase ${phase}`}
                  width={320}
                  height={320}
                  loading="eager"
                  className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                  animate={watering ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
                {/* Weicher Bodenschatten direkt unter dem Keimling */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{
                    bottom: "8%",
                    width: "60%",
                    height: "18px",
                    background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, transparent 75%)",
                    filter: "blur(6px)",
                  }}
                  aria-hidden
                />
                {/* Subtile leuchtende Wurzeln, die durch das Moos wachsen */}
                <svg
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{ bottom: "-28px", opacity: 0.55, mixBlendMode: "screen" }}
                  width="140"
                  height="70"
                  viewBox="0 0 140 70"
                  fill="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="rootGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.9" />
                      <stop offset="60%" stopColor="#67e8f9" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M70 0 C 68 18, 50 30, 38 58" stroke="url(#rootGrad)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M70 0 C 72 18, 90 30, 102 58" stroke="url(#rootGrad)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M70 0 C 70 22, 70 40, 70 64" stroke="url(#rootGrad)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M70 4 C 64 20, 58 34, 54 56" stroke="url(#rootGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                  <path d="M70 4 C 76 20, 82 34, 86 56" stroke="url(#rootGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                </svg>
                {/* Watering droplets */}
                <AnimatePresence>
                  {watering && (
                    <>
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: -40, x: -20 + i * 12 }}
                          animate={{ opacity: [0, 1, 0], y: 80 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.2, delay: i * 0.1 }}
                          className="absolute left-1/2 top-1/4 w-1.5 h-3 rounded-full"
                          style={{ background: "linear-gradient(180deg, #67e8f9, #a5f3fc)", filter: "drop-shadow(0 0 4px rgba(103,232,249,0.8))" }}
                        />
                      ))}
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Kosmischer Moos-Teppich — solide, undurchsichtige Bodenmasse */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{ height: "20vh" }}
        >
          {/* Solide Basis: tiefes Violett-Indigo, undurchsichtig */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #1a1530 0%, #14102a 35%, #0d0a20 100%)",
            }}
          />
          {/* Klarer flacher Horizont mit weichem Moos-Saum */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: "14px",
              background:
                "linear-gradient(180deg, transparent 0%, rgba(94,72,140,0.45) 40%, rgba(60,45,100,0.85) 100%)",
              filter: "blur(1px)",
            }}
          />
          {/* Dichte Moos-Textur: weiche, gepunktete Oberfläche */}
          <div
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage: [
                "radial-gradient(circle at 12% 22%, rgba(94,234,212,0.18) 0px, transparent 4px)",
                "radial-gradient(circle at 28% 48%, rgba(167,139,250,0.22) 0px, transparent 5px)",
                "radial-gradient(circle at 47% 18%, rgba(94,234,212,0.16) 0px, transparent 3px)",
                "radial-gradient(circle at 62% 55%, rgba(129,140,248,0.2) 0px, transparent 4px)",
                "radial-gradient(circle at 78% 30%, rgba(94,234,212,0.18) 0px, transparent 4px)",
                "radial-gradient(circle at 88% 62%, rgba(167,139,250,0.18) 0px, transparent 5px)",
                "radial-gradient(circle at 18% 72%, rgba(94,234,212,0.14) 0px, transparent 3px)",
                "radial-gradient(circle at 55% 85%, rgba(129,140,248,0.18) 0px, transparent 4px)",
                "radial-gradient(circle at 92% 88%, rgba(94,234,212,0.14) 0px, transparent 3px)",
                "radial-gradient(circle at 38% 92%, rgba(167,139,250,0.16) 0px, transparent 4px)",
              ].join(", "),
              backgroundSize: "180px 180px",
            }}
          />
          {/* Sekundäre Cyan-Beleuchtung: sanfter Glow nach oben (auf Arkies Füße & Stängel) */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: "60px",
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.18) 0%, rgba(103,232,249,0.08) 40%, transparent 80%)",
              transform: "translateY(-30px)",
              filter: "blur(8px)",
            }}
          />
          {/* Eingefangene Galaxien — funkelnde Sterne im Moos */}
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: i % 4 === 0 ? 2 : 1.5,
                height: i % 4 === 0 ? 2 : 1.5,
                left: `${(i * 53) % 100}%`,
                bottom: `${5 + ((i * 7) % 70)}%`,
                background: i % 3 === 0 ? "#a5f3fc" : i % 3 === 1 ? "#c4b5fd" : "#fff",
                filter: "drop-shadow(0 0 3px rgba(165,243,252,0.9))",
              }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: (i % 5) * 0.4 }}
            />
          ))}
        </div>

        {/* Arkie walking on the ground */}
        <motion.div
          className="absolute z-20"
          style={{ bottom: "13vh" }}
          initial={{ x: -100 }}
          animate={watering ? { x: 0 } : { x: [-110, 110, -110] }}
          transition={watering ? { duration: 0.6 } : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            {/* Weicher Bodenschatten unter Arkie */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                bottom: "-8px",
                width: "70%",
                height: "10px",
                background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 50%, transparent 80%)",
                filter: "blur(4px)",
              }}
              aria-hidden
            />
            <Arkie size="small" />
            {/* Watering can */}
            <AnimatePresence>
              {watering && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
                  animate={{ opacity: 1, scale: 1, rotate: -25 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -right-3 -top-1 text-2xl"
                  aria-hidden
                >
                  💧
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Subtle phase hint at bottom */}
        <div className="absolute bottom-3 left-0 right-0 text-center z-30 pointer-events-none">
          <p className="text-[11px] text-muted-foreground/60 tracking-widest uppercase">
            {PHASE_RANGES[phase - 1]?.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SanctuaryPage;
