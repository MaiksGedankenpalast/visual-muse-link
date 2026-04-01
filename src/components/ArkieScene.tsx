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
        {/* Wave layer 1 (back, darker) */}
        <div className="absolute inset-0 z-10 wave-back">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="h-full"
            style={{ width: "200%", minWidth: "200%" }}
          >
            <path
              d="M0 60 C150 20 300 90 450 50 C600 10 750 80 900 45 C1050 10 1150 70 1200 40 L1200 120 L0 120Z"
              fill="#3D1F7A"
            />
          </svg>
        </div>

        {/* Wave layer 2 (front, lighter) */}
        <div className="absolute inset-0 z-20 wave-front" style={{ top: -10 }}>
          <svg
            viewBox="0 0 1200 100"
            preserveAspectRatio="none"
            className="h-full"
            style={{ width: "200%", minWidth: "200%" }}
          >
            <path
              d="M0 50 C100 80 250 20 400 55 C550 90 700 25 850 60 C1000 95 1100 30 1200 50 L1200 100 L0 100Z"
              fill="#5B2D9E"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ArkieScene;
