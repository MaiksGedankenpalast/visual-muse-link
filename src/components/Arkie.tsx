interface ArkieProps {
  size?: "large" | "medium" | "small" | number;
  className?: string;
}

const SIZE_MAP = { large: 90, medium: 70, small: 50 };

const Arkie = ({ size = "large", className = "" }: ArkieProps) => {
  const px = typeof size === "number" ? size : SIZE_MAP[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="arkie-float relative" style={{ width: px, height: px }}>
        {/* Outer glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: px * 1.4,
            height: px * 0.5,
            bottom: -px * 0.12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(ellipse, rgba(192,132,252,0.35), rgba(168,85,247,0.12) 50%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />
        {/* Body */}
        <svg
          viewBox="0 0 100 100"
          width={px}
          height={px}
          className="relative"
          style={{ filter: "drop-shadow(0 0 12px rgba(168,85,247,0.5))" }}
        >
          <defs>
            <radialGradient id={`arkie-body-${px}`} cx="40%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#E8D5FF" />
              <stop offset="40%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#9333EA" />
            </radialGradient>
          </defs>
          {/* Circle body */}
          <circle cx="50" cy="50" r="48" fill={`url(#arkie-body-${px})`} />
          {/* Left eye */}
          <ellipse cx="38" cy="44" rx="4.5" ry="4" fill="#1a1a2e" />
          {/* Right eye */}
          <ellipse cx="62" cy="44" rx="4.5" ry="4" fill="#1a1a2e" />
          {/* Smile */}
          <path
            d="M42 56 Q50 63 58 56"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default Arkie;
