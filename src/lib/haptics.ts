/**
 * Haptic feedback helpers (Vibration API).
 * Safe no-op when the browser does not support navigator.vibrate.
 */

type Pattern = "tap" | "success" | "warning" | "selection";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 20,           // crisp mechanical click
  selection: 10,     // very light tick
  success: [15, 30, 25],
  warning: [40, 60, 40],
};

function canVibrate(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

export function haptic(pattern: Pattern = "tap"): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* ignore */
  }
}

/** Convenience shortcuts. */
export const hapticTap = () => haptic("tap");
export const hapticSuccess = () => haptic("success");
