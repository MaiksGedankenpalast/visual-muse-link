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

const TREE_ASSETS = [tree1, tree2, tree3, tree4, tree5];

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
    haptic("light");
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
        {/* Tree */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "18vh" }}>
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

        {/* Moss ground */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: "22vh",
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(45,212,168,0.35) 0%, rgba(45,212,168,0.15) 35%, transparent 70%), linear-gradient(180deg, transparent 0%, rgba(20,30,25,0.6) 60%, rgba(10,15,12,0.9) 100%)",
            filter: "blur(0.5px)",
          }}
        />
        {/* Tiny ground sparkles */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none" style={{ height: "22vh" }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-300"
              style={{
                left: `${(i * 53) % 100}%`,
                bottom: `${5 + ((i * 7) % 60)}%`,
                filter: "drop-shadow(0 0 4px rgba(103,232,249,0.9))",
              }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: (i % 5) * 0.4 }}
            />
          ))}
        </div>

        {/* Arkie walking on the ground */}
        <motion.div
          className="absolute z-20"
          style={{ bottom: "9vh" }}
          initial={{ x: -100 }}
          animate={watering ? { x: 0 } : { x: [-110, 110, -110] }}
          transition={watering ? { duration: 0.6 } : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
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
        <div className="absolute bottom-3 left-0 right-0 text-center z-20 pointer-events-none">
          <p className="text-[11px] text-muted-foreground/60 tracking-widest uppercase">
            {PHASE_RANGES[phase - 1]?.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SanctuaryPage;
