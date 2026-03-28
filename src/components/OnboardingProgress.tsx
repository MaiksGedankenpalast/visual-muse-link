interface OnboardingProgressProps {
  currentStep: number; // 1-4
  totalSteps?: number;
}

const OnboardingProgress = ({ currentStep, totalSteps = 4 }: OnboardingProgressProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step <= currentStep;
        const isCurrent = step === currentStep;
        return (
          <div
            key={step}
            className="rounded-full transition-all duration-300"
            style={{
              width: isCurrent ? 28 : 8,
              height: 8,
              background: isActive
                ? "linear-gradient(135deg, var(--mindark-accent-start), var(--mindark-accent-end))"
                : "rgba(255,255,255,0.2)",
            }}
          />
        );
      })}
    </div>
  );
};

export default OnboardingProgress;
