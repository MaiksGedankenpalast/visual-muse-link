import Arkie from "./Arkie";

interface ArkieSceneProps {
  arkieSize?: "large" | "medium" | "small" | number;
  statusText?: string;
  className?: string;
}

const ArkieScene = ({ arkieSize = "large", statusText, className = "" }: ArkieSceneProps) => {
  return (
    <div className={`relative w-full ${className}`}>
      {/* Arkie positioned above waves */}
      <div className="relative z-20 flex flex-col items-center" style={{ marginBottom: -30 }}>
        <Arkie size={arkieSize} />
        {statusText && (
          <p className="text-xs text-muted-foreground mt-2 text-center px-8">{statusText}</p>
        )}
      </div>

      {/* Waves container */}
      <div className="relative w-full overflow-hidden" style={{ height: 120 }}>
        {/* Wave layer 1 (back, darker) — path repeats identically so translateX(-50%) = seamless */}
        <div className="absolute inset-0 z-10 wave-back">
          <svg
            viewBox="0 0 2400 120"
            preserveAspectRatio="none"
            className="h-full"
            style={{ width: "200%", minWidth: "200%" }}
          >
            <path
              d="M0 60 C150 20 300 90 450 50 C600 10 750 80 900 45 C1050 10 1150 70 1200 40 C1350 20 1500 90 1650 50 C1800 10 1950 80 2100 45 C2250 10 2350 70 2400 40 L2400 120 L0 120Z"
              fill="#3D1F7A"
            />
          </svg>
        </div>

        {/* Wave layer 2 (front, lighter) */}
        <div className="absolute inset-0 z-20 wave-front" style={{ top: -10 }}>
          <svg
            viewBox="0 0 2400 100"
            preserveAspectRatio="none"
            className="h-full"
            style={{ width: "200%", minWidth: "200%" }}
          >
            <path
              d="M0 50 C100 80 250 20 400 55 C550 90 700 25 850 60 C1000 95 1100 30 1200 50 C1300 80 1450 20 1600 55 C1750 90 1900 25 2050 60 C2200 95 2300 30 2400 50 L2400 100 L0 100Z"
              fill="#5B2D9E"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ArkieScene;
