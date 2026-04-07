import Arkie from "./Arkie";

interface ArkieSceneProps {
  arkieSize?: "large" | "medium" | "small" | number;
  statusText?: string;
  className?: string;
}

const ArkieScene = ({ arkieSize = "large", statusText, className = "" }: ArkieSceneProps) => {
  return (
    <div className={`relative w-full ${className}`}>
      {/* Arkie positioned to sit ON the middle wave */}
      <div className="relative z-30 flex flex-col items-center" style={{ marginBottom: -50 }}>
        <Arkie size={arkieSize} />
      </div>

      {/* Three wave layers with parallax */}
      <div className="relative w-full overflow-hidden" style={{ height: 130 }}>
        {/* Wave layer 1 — back, deepest/darkest purple */}
        <div className="absolute inset-0 z-10 wave-back">
          <svg
            viewBox="0 0 2400 130"
            preserveAspectRatio="none"
            className="h-full"
            style={{ width: "200%", minWidth: "200%" }}
          >
            <defs>
              <linearGradient id="wave-back-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E0A3C" />
                <stop offset="100%" stopColor="#160830" />
              </linearGradient>
            </defs>
            <path
              d="M0 65 C150 25 300 95 450 55 C600 15 750 85 900 50 C1050 15 1150 75 1200 45 C1350 25 1500 95 1650 55 C1800 15 1950 85 2100 50 C2250 15 2350 75 2400 45 L2400 130 L0 130Z"
              fill="url(#wave-back-grad)"
            />
          </svg>
        </div>

        {/* Wave layer 2 — middle, medium purple */}
        <div className="absolute inset-0 z-20 wave-mid" style={{ top: -4 }}>
          <svg
            viewBox="0 0 2400 120"
            preserveAspectRatio="none"
            className="h-full"
            style={{ width: "200%", minWidth: "200%" }}
          >
            <defs>
              <linearGradient id="wave-mid-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D1B6E" />
                <stop offset="100%" stopColor="#2A1254" />
              </linearGradient>
            </defs>
            <path
              d="M0 50 C100 80 250 20 400 55 C550 90 700 25 850 60 C1000 95 1100 30 1200 50 C1300 80 1450 20 1600 55 C1750 90 1900 25 2050 60 C2200 95 2300 30 2400 50 L2400 120 L0 120Z"
              fill="url(#wave-mid-grad)"
            />
          </svg>
        </div>

        {/* Wave layer 3 — front, lighter vibrant purple */}
        <div className="absolute inset-0 z-25 wave-front" style={{ top: -10 }}>
          <svg
            viewBox="0 0 2400 110"
            preserveAspectRatio="none"
            className="h-full"
            style={{ width: "200%", minWidth: "200%" }}
          >
            <defs>
              <linearGradient id="wave-front-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B2D9E" />
                <stop offset="100%" stopColor="#4A2080" />
              </linearGradient>
            </defs>
            <path
              d="M0 55 C120 30 240 75 400 45 C560 15 680 70 850 50 C1020 30 1100 65 1200 55 C1320 30 1440 75 1600 45 C1760 15 1880 70 2050 50 C2220 30 2300 65 2400 55 L2400 110 L0 110Z"
              fill="url(#wave-front-grad)"
            />
          </svg>
        </div>
      </div>

      {/* Status text below waves */}
      {statusText && (
        <p className="text-xs text-muted-foreground text-center px-8 mt-1 relative z-10">{statusText}</p>
      )}
    </div>
  );
};

export default ArkieScene;
