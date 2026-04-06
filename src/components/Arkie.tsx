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
        {/* Outer glow — softer, lighter, more diffused */}
        <div
          className="absolute rounded-full"
          style={{
            width: px * 1.6,
            height: px * 0.45,
            bottom: -px * 0.08,
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(ellipse, rgba(210,180,255,0.3), rgba(180,140,240,0.1) 50%, transparent 75%)",
            filter: "blur(14px)",
          }}
        />
        {/* Body */}
        <svg
          viewBox="0 0 100 100"
          width={px}
          height={px}
          className="relative"
          style={{ filter: "drop-shadow(0 0 18px rgba(220,200,255,0.3))" }}
        >
          <defs>
            <radialGradient id={`arkie-body-${px}`} cx="42%" cy="38%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="20%" stopColor="#F5EEFF" />
              <stop offset="45%" stopColor="#E8D5FF" />
              <stop offset="70%" stopColor="#D4B4FE" />
              <stop offset="100%" stopColor="#B888F0" />
            </radialGradient>
          </defs>
          {/* Circle body */}
          <circle cx="50" cy="50" r="48" fill={`url(#arkie-body-${px})`} />
          {/* Left eye */}
          <ellipse cx="38" cy="45" rx="4" ry="3.5" fill="#1a1a2e" />
          {/* Right eye */}
          <ellipse cx="62" cy="45" rx="4" ry="3.5" fill="#1a1a2e" />
          {/* Smile */}
          <path
            d="M42 57 Q50 63 58 57"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default Arkie;
