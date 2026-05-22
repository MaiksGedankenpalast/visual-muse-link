import { useMemo } from "react";

const StarBackground = () => {
  const stars = useMemo(() => {
    const count = 110;
    const sizes = [1.2, 1.5, 1.75, 2];
    const result: { x: number; y: number; size: number; opacity: number; twinkle: boolean; duration: number }[] = [];
    for (let i = 0; i < count; i++) {
      const seed = (i * 7919 + 104729) % 100000;
      const x = ((seed * 13) % 960) / 10 + 2;   // 2–98%
      const y = ((seed * 17) % 980) / 10 + 1;   // 1–99% — kompletter Screen
      const size = sizes[i % 4];
      const opacity = 0.35 + ((seed % 5) / 12);
      const twinkle = i % 3 === 0;
      const duration = 3 + ((seed % 50) / 10);
      result.push({ x, y, size, opacity: Math.min(opacity, 0.75), twinkle, duration });
    }
    return result;
  }, []);

  return (
    <div
      className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-0 pointer-events-none overflow-hidden"
    >
      {stars.map((s, i) => (
        <div
          key={i}
          className={`absolute rounded-full bg-white ${s.twinkle ? "star-twinkle" : ""}`}
          style={{
            width: s.size,
            height: s.size,
            left: `${s.x}%`,
            top: `${s.y}%`,
            opacity: s.opacity,
            ...(s.twinkle ? { animationDuration: `${s.duration}s` } as React.CSSProperties : {}),
          }}
        />
      ))}
    </div>
  );
};

export default StarBackground;
