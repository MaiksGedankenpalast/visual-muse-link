import { useMemo } from "react";

const StarBackground = () => {
  const stars = useMemo(() => {
    const count = 40;
    const result: { x: number; y: number; size: number; opacity: number; twinkle: boolean; duration: number }[] = [];
    // seeded-ish random for consistency
    for (let i = 0; i < count; i++) {
      const seed = (i * 7919 + 104729) % 100000;
      const x = (seed % 1000) / 10;
      const y = ((seed * 3) % 1000) / 10;
      const sizes = [1, 1, 1.5, 1.5, 2];
      const size = sizes[i % sizes.length];
      const opacity = 0.3 + ((seed % 7) / 10);
      const twinkle = i % 3 === 0; // ~33%
      const duration = 2 + ((seed % 30) / 10); // 2-5s
      result.push({ x, y, size, opacity: Math.min(opacity, 0.9), twinkle, duration });
    }
    return result;
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
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
