import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HomePage from "./HomePage";
import MomentsPage from "./MomentsPage";

/**
 * Horizontal-Swiper-Wrapper, der Home und Glücksmomente nebeneinander mountet.
 * - Swipe links auf /home → Glücksmomente
 * - Swipe rechts → zurück zu Home
 * Der HomePage-Inhalt selbst wird nicht verändert.
 */
const HomeSwiper = () => {
  const [index, setIndex] = useState(0); // 0 = Home, 1 = Moments
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(containerRef.current?.offsetWidth ?? window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(1, i)));

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Page indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 pointer-events-none">
        <span
          className="rounded-full transition-all duration-300"
          style={{
            width: index === 0 ? 18 : 6,
            height: 6,
            background: index === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
          }}
        />
        <span
          className="rounded-full transition-all duration-300"
          style={{
            width: index === 1 ? 18 : 6,
            height: 6,
            background: index === 1 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
          }}
        />
      </div>

      <motion.div
        className="flex"
        style={{ width: width * 2 }}
        animate={{ x: -index * width }}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        drag="x"
        dragConstraints={{ left: -width, right: 0 }}
        dragElastic={0.18}
        onDragEnd={(_, info) => {
          const threshold = width * 0.18;
          if (info.offset.x < -threshold || info.velocity.x < -400) goTo(index + 1);
          else if (info.offset.x > threshold || info.velocity.x > 400) goTo(index - 1);
        }}
      >
        <div style={{ width }} className="shrink-0">
          <HomePage />
        </div>
        <div style={{ width }} className="shrink-0">
          <MomentsPage />
        </div>
      </motion.div>
    </div>
  );
};

export default HomeSwiper;