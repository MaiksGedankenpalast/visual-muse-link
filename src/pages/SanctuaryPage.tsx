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
        {/* Hintergrund-Sterne (Parallaxe — langsamer als Boden-Sterne) */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
          {Array.from({ length: 38 }).map((_, i) => {
            const seed = (i * 9301 + 49297) % 233280;
            const left = (seed % 1000) / 10;
            const top = ((seed * 7) % 700) / 10;
            const size = (i % 5 === 0) ? 2 : 1.2;
            return (
              <motion.div
                key={`bgstar-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: size,
                  height: size,
                  left: `${left}%`,
                  top: `${top}%`,
                  filter: "drop-shadow(0 0 2px rgba(255,255,255,0.7))",
                }}
                animate={{ opacity: [0.25, 0.85, 0.25] }}
                transition={{
                  duration: 7 + (i % 6),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i % 8) * 0.6,
                }}
              />
            );
          })}
        </div>

        {/* Mond oben rechts — sanftes Leuchten + Strahlen */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{ top: "5vh", right: "6vw" }}
          aria-hidden
        >
          {/* Mond-Halo (subtiles Pulsieren) */}
          <motion.div
            className="absolute inset-0 -z-10 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(254,243,199,0.55) 0%, rgba(254,243,199,0.22) 35%, transparent 70%)",
              filter: "blur(22px)",
              transform: "scale(2.4)",
            }}
            animate={{ opacity: [0.55, 1, 0.55], scale: [2.3, 2.55, 2.3] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Mondstrahlen — fallen schräg nach unten, faden ein/aus */}
          <div
            className="absolute pointer-events-none -z-[5]"
            style={{
              top: "50%",
              left: "50%",
              width: "1px",
              height: "1px",
            }}
            aria-hidden
          >
            {[
              { angle: 28, length: 320, width: 2, dur: 7, delay: 0, max: 0.32 },
              { angle: 38, length: 260, width: 1.5, dur: 9, delay: 1.4, max: 0.22 },
              { angle: 48, length: 380, width: 2, dur: 8, delay: 0.7, max: 0.28 },
              { angle: 58, length: 220, width: 1.2, dur: 11, delay: 2.2, max: 0.2 },
              { angle: 68, length: 340, width: 1.6, dur: 9.5, delay: 0.3, max: 0.26 },
              { angle: 78, length: 280, width: 1.3, dur: 12, delay: 1.8, max: 0.22 },
            ].map((ray, i) => (
              <motion.div
                key={`ray-${i}`}
                className="absolute"
                style={{
                  width: `${ray.width}px`,
                  height: `${ray.length}px`,
                  top: 0,
                  left: 0,
                  background:
                    "linear-gradient(180deg, rgba(254,243,199,0.85) 0%, rgba(254,243,199,0.35) 40%, transparent 100%)",
                  filter: "blur(1.5px)",
                  transformOrigin: "top center",
                  transform: `rotate(${ray.angle + 180}deg)`,
                }}
                animate={{ opacity: [0, ray.max, 0] }}
                transition={{
                  duration: ray.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: ray.delay,
                }}
              />
            ))}
          </div>
          <motion.img
            src={moonImg}
            alt="Mond"
            width={120}
            height={120}
            loading="lazy"
            className="w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] object-contain drop-shadow-[0_0_24px_rgba(254,243,199,0.7)]"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Tree — Stängel sitzt exakt auf der Moos-Oberfläche auf */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: `${FLOOR_VH}vh` }}>
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
                style={{ transformOrigin: "bottom center" }}
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
                  className="block w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] object-contain object-bottom drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                  animate={watering ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
                {/* Weicher Bodenschatten direkt unter dem Keimling, auf der Moos-Oberfläche */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{
                    bottom: "-6px",
                    width: "60%",
                    height: "16px",
                    background:
                      "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 45%, transparent 78%)",
                    filter: "blur(5px)",
                  }}
                  aria-hidden
                />
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

        {/* Wurzeln — sitzen direkt unter der Moos-Oberfläche, am Stängel-Fuß */}
        {!loading && (
          <svg
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-[15]"
            style={{ bottom: `calc(${FLOOR_VH}vh - 56px)`, opacity: 0.45, mixBlendMode: "screen" }}
            width="140"
            height="70"
            viewBox="0 0 140 70"
            fill="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="rootGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#67e8f9" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M70 0 C 68 18, 50 30, 38 58" stroke="url(#rootGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M70 0 C 72 18, 90 30, 102 58" stroke="url(#rootGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M70 0 C 70 22, 70 40, 70 64" stroke="url(#rootGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M70 4 C 64 20, 58 34, 54 56" stroke="url(#rootGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
            <path d="M70 4 C 76 20, 82 34, 86 56" stroke="url(#rootGrad)" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
          </svg>
        )}

        {/* Kosmische Glühwürmchen — schweben über der Moos-Ebene */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-[18]"
          style={{ bottom: `${FLOOR_VH}vh`, height: "45vh" }}
          aria-hidden
        >
          {Array.from({ length: 14 }).map((_, i) => {
            const isCyan = i % 2 === 0;
            const startX = (i * 41) % 100;
            const drift = 30 + ((i * 17) % 60);
            const dur = 14 + (i % 5) * 3;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  left: `${startX}%`,
                  bottom: `${10 + ((i * 13) % 70)}%`,
                  background: isCyan ? "#a5f3fc" : "#c4b5fd",
                  boxShadow: isCyan
                    ? "0 0 8px 2px rgba(165,243,252,0.85), 0 0 16px 4px rgba(103,232,249,0.4)"
                    : "0 0 8px 2px rgba(196,181,253,0.85), 0 0 16px 4px rgba(167,139,250,0.4)",
                }}
                animate={{
                  x: [0, drift, -drift / 2, drift / 3, 0],
                  y: [0, -20, -8, -28, 0],
                  opacity: [0.2, 1, 0.5, 1, 0.2],
                  scale: [0.7, 1.1, 0.9, 1.2, 0.7],
                }}
                transition={{
                  duration: dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i % 6) * 0.7,
                }}
              />
            );
          })}
        </div>

        {/* Kosmischer Moos-Teppich — solide Masse mit Puschel-Textur und Tiefen-Gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{ height: `${FLOOR_VH}vh` }}
        >
          {/* Solide Basis: oben helleres Cyan-Moos, nach unten tiefes Violett-Indigo */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #1f3a4a 0%, #1a2540 22%, #161236 55%, #0d0a20 100%)",
            }}
          />
          {/* Klarer flacher Horizont mit weichem Cyan-Moos-Saum */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: "10px",
              background:
                "linear-gradient(180deg, rgba(165,243,252,0.55) 0%, rgba(103,232,249,0.35) 50%, transparent 100%)",
              filter: "blur(0.5px)",
            }}
          />
          {/* Puschel-Textur: dichte runde Moos-Hügel mit Licht & Schatten */}
          <div
            className="absolute inset-0 opacity-90"
            style={{
              backgroundImage: [
                // Helle Highlights (oben links) — geben den Puscheln Volumen
                "radial-gradient(circle at 10% 20%, rgba(165,243,252,0.55) 0px, rgba(103,232,249,0.18) 6px, transparent 11px)",
                "radial-gradient(circle at 26% 32%, rgba(165,243,252,0.5) 0px, rgba(103,232,249,0.15) 7px, transparent 13px)",
                "radial-gradient(circle at 44% 24%, rgba(165,243,252,0.55) 0px, rgba(103,232,249,0.18) 6px, transparent 11px)",
                "radial-gradient(circle at 60% 35%, rgba(196,181,253,0.5) 0px, rgba(167,139,250,0.18) 7px, transparent 13px)",
                "radial-gradient(circle at 76% 22%, rgba(165,243,252,0.55) 0px, rgba(103,232,249,0.18) 6px, transparent 12px)",
                "radial-gradient(circle at 90% 30%, rgba(196,181,253,0.5) 0px, rgba(167,139,250,0.18) 7px, transparent 13px)",
                "radial-gradient(circle at 18% 55%, rgba(165,243,252,0.45) 0px, rgba(103,232,249,0.14) 6px, transparent 11px)",
                "radial-gradient(circle at 38% 62%, rgba(196,181,253,0.42) 0px, rgba(167,139,250,0.14) 7px, transparent 13px)",
                "radial-gradient(circle at 58% 58%, rgba(165,243,252,0.4) 0px, rgba(103,232,249,0.12) 6px, transparent 11px)",
                "radial-gradient(circle at 80% 64%, rgba(196,181,253,0.42) 0px, rgba(167,139,250,0.14) 7px, transparent 13px)",
                "radial-gradient(circle at 25% 82%, rgba(165,243,252,0.32) 0px, rgba(103,232,249,0.1) 6px, transparent 11px)",
                "radial-gradient(circle at 55% 88%, rgba(196,181,253,0.32) 0px, rgba(167,139,250,0.1) 7px, transparent 13px)",
                "radial-gradient(circle at 88% 86%, rgba(165,243,252,0.3) 0px, rgba(103,232,249,0.1) 6px, transparent 11px)",
              ].join(", "),
              backgroundSize: "220px 200px",
            }}
          />
          {/* Schatten unter den Puscheln (untere Hälfte jedes Hügels) */}
          <div
            className="absolute inset-0 opacity-70 mix-blend-multiply"
            style={{
              backgroundImage: [
                "radial-gradient(circle at 14% 26%, rgba(8,4,20,0.55) 0px, transparent 9px)",
                "radial-gradient(circle at 30% 38%, rgba(8,4,20,0.5) 0px, transparent 10px)",
                "radial-gradient(circle at 48% 30%, rgba(8,4,20,0.55) 0px, transparent 9px)",
                "radial-gradient(circle at 64% 41%, rgba(8,4,20,0.5) 0px, transparent 10px)",
                "radial-gradient(circle at 80% 28%, rgba(8,4,20,0.55) 0px, transparent 9px)",
                "radial-gradient(circle at 94% 36%, rgba(8,4,20,0.5) 0px, transparent 10px)",
                "radial-gradient(circle at 22% 60%, rgba(8,4,20,0.45) 0px, transparent 9px)",
                "radial-gradient(circle at 42% 67%, rgba(8,4,20,0.45) 0px, transparent 10px)",
                "radial-gradient(circle at 62% 63%, rgba(8,4,20,0.45) 0px, transparent 9px)",
                "radial-gradient(circle at 84% 69%, rgba(8,4,20,0.45) 0px, transparent 10px)",
              ].join(", "),
              backgroundSize: "220px 200px",
            }}
          />
          {/* Sekundäre Cyan-Beleuchtung: sanfter Glow nach oben (auf Arkies Füße & Stängel) */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: "70px",
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.22) 0%, rgba(103,232,249,0.1) 40%, transparent 80%)",
              transform: "translateY(-35px)",
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

        {/* Arkie — Füße sitzen exakt auf der Moos-Oberfläche */}
        <motion.div
          className="absolute z-20"
          style={{ bottom: `${FLOOR_VH}vh` }}
          initial={{ x: -100 }}
          animate={watering ? { x: 0 } : { x: [-110, 110, -110] }}
          transition={watering ? { duration: 0.6 } : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            {/* Weicher Bodenschatten unter Arkie auf der Moos-Oberfläche */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                bottom: "-4px",
                width: "70%",
                height: "9px",
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

        {/* Subtle phase hint — schwebt unter der Moos-Ebene am unteren Rand, klar sichtbar */}
        <div
          className="absolute left-0 right-0 text-center z-30 pointer-events-none"
          style={{ bottom: "8px" }}
        >
          <p className="text-[11px] text-muted-foreground/60 tracking-widest uppercase">
            {PHASE_RANGES[phase - 1]?.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SanctuaryPage;
