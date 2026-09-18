/**
 * Native Haptic Feedback Engine for Mobile PWA
 * Safely calls navigator.vibrate when supported by mobile browsers
 */

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

export function triggerHaptic(type: HapticType = "light") {
  if (typeof window === "undefined" || !("navigator" in window) || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case "light":
      case "selection":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "success":
        navigator.vibrate([15, 60, 25]);
        break;
      case "warning":
        navigator.vibrate([30, 80, 30]);
        break;
      case "error":
        navigator.vibrate([50, 60, 50, 60, 50]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Graceful fallback for non-supported browsers
  }
}
