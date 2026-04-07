import { useMemo } from "react";

const StarBackground = () => {
  const stars = useMemo(() => {
    const count = 40;
    const sizes = [1.5, 1.65, 1.725];
    const result: { x: number; y: number; size: number; opacity: number; twinkle: boolean; duration: number }[] = [];
    for (let i = 0; i < count; i++) {
      const seed = (i * 7919 + 104729) % 100000;
      const x = ((seed * 13) % 900) / 10 + 5; // 5–95% horizontal
      const y = ((seed * 7) % 850) / 10 + 5;  // 5–90% vertical
      const size = sizes[i % 3];
      const opacity = 0.5 + ((seed % 4) / 10);
      const twinkle = i % 4 === 0;
      const duration = 3 + ((seed % 50) / 10);
      result.push({ x, y, size, opacity: Math.min(opacity, 0.8), twinkle, duration });
    }
    return result;
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
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
