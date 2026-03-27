interface ArkieProps {
  size?: number;
  className?: string;
}

const Arkie = ({ size = 90, className = "" }: ArkieProps) => {
  const eyeSize = size * 0.09;
  const eyeY = size * 0.38;
  const leftEyeX = size * 0.35;
  const rightEyeX = size * 0.65;
  const smileY = size * 0.52;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="arkie-float relative"
        style={{ width: size, height: size }}
      >
        {/* Glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: size * 0.8,
            height: size * 0.3,
            bottom: -size * 0.05,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse, var(--mindark-glow), transparent 70%)',
          }}
        />
        {/* Body */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 35%, #E4D4F4, #C99EF0 40%, #9B6FD4 80%, #7B5EA7)`,
            boxShadow: '0 0 30px var(--mindark-glow), 0 0 60px rgba(155, 111, 212, 0.2)',
          }}
        />
        {/* Left eye */}
        <div
          className="absolute rounded-full"
          style={{
            width: eyeSize,
            height: eyeSize * 1.2,
            left: leftEyeX,
            top: eyeY,
            background: '#1a1a2e',
          }}
        />
        {/* Right eye */}
        <div
          className="absolute rounded-full"
          style={{
            width: eyeSize,
            height: eyeSize * 1.2,
            left: rightEyeX,
            top: eyeY,
            background: '#1a1a2e',
          }}
        />
        {/* Smile */}
        <div
          className="absolute"
          style={{
            width: size * 0.18,
            height: size * 0.08,
            left: '50%',
            top: smileY,
            transform: 'translateX(-50%)',
            borderBottom: '2px solid #1a1a2e',
            borderRadius: '0 0 50% 50%',
          }}
        />
      </div>
    </div>
  );
};

export default Arkie;
