import { useMemo } from "react";

const StarBackground = () => {
  const stars = useMemo(() => {
    const count = 40;
    const result: { x: number; y: number; size: number; opacity: number; blur: number; twinkle: boolean; duration: number }[] = [];
    for (let i = 0; i < count; i++) {
      const seed = (i * 7919 + 104729) % 100000;
      const x = (seed % 1000) / 10;
      const y = ((seed * 3) % 1000) / 10;
      const sizes = [1, 1.2, 1.5, 1.8, 2, 2.5];
      const size = sizes[i % sizes.length];
      const opacity = 0.12 + ((seed % 6) / 15);
      const blur = size > 1.8 ? 1 : 0; // bokeh on larger stars
      const twinkle = i % 3 === 0; // ~33% twinkle
      const duration = 3 + ((seed % 50) / 10); // 3-8s
      result.push({ x, y, size, opacity: Math.min(opacity, 0.5), blur, twinkle, duration });
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
            filter: s.blur ? `blur(${s.blur}px)` : undefined,
            ...(s.twinkle ? { animationDuration: `${s.duration}s` } as React.CSSProperties : {}),
          }}
        />
      ))}
    </div>
  );
};

export default StarBackground;
