interface ArkieProps {
  size?: "large" | "medium" | "small" | number;
  className?: string;
}

const SIZE_MAP = { large: 85, medium: 64, small: 47 };

const Arkie = ({ size = "large", className = "" }: ArkieProps) => {
  const px = typeof size === "number" ? size : SIZE_MAP[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="arkie-float relative" style={{ width: px, height: px }}>
        {/* Under-glow reflection on waves */}
        <div
          className="absolute"
          style={{
            width: px * 1.4,
            height: px * 0.5,
            bottom: -px * 0.18,
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(ellipse, rgba(190,160,255,0.45) 0%, rgba(160,120,240,0.2) 40%, transparent 70%)",
            filter: "blur(16px)",
          }}
        />
        {/* Body — luminous 3D sphere */}
        <svg
          viewBox="0 0 100 100"
          width={px}
          height={px}
          className="relative"
          style={{ filter: "drop-shadow(0 0 22px rgba(200,170,255,0.35))" }}
        >
          <defs>
            <radialGradient id={`arkie-body-${px}`} cx="40%" cy="36%" r="52%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="18%" stopColor="#F0E6FF" />
              <stop offset="40%" stopColor="#E0CCFF" />
              <stop offset="65%" stopColor="#C9A4F5" />
              <stop offset="85%" stopColor="#B080E8" />
              <stop offset="100%" stopColor="#9B6BD0" />
            </radialGradient>
            {/* Subtle inner highlight for 3D effect */}
            <radialGradient id={`arkie-highlight-${px}`} cx="35%" cy="30%" r="30%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          {/* Main sphere */}
          <circle cx="50" cy="50" r="47" fill={`url(#arkie-body-${px})`} />
          {/* Inner glow highlight */}
          <circle cx="50" cy="50" r="47" fill={`url(#arkie-highlight-${px})`} />
          {/* Left eye — almond-shaped, slightly tilted */}
          <path d="M33 46 Q39 40 45 46 Q39 49 33 46Z" fill="#1a1a2e" opacity="0.85" />
          {/* Right eye — almond-shaped, slightly tilted */}
          <path d="M55 46 Q61 40 67 46 Q61 49 55 46Z" fill="#1a1a2e" opacity="0.85" />
          {/* Small centered smile */}
          <path
            d="M45 57 Q50 61 55 57"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>
    </div>
  );
};

export default Arkie;
