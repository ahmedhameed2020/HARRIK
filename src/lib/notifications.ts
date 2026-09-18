// Sound & Browser Notifications utility for HARRIK

/**
 * Play a crystal-clear melodic chime using Web Audio API
 * No external audio files needed - works 100% offline and instantaneously.
 */
export function playAlertChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1 (High pitch, pleasant bell)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2 (Harmonic crescendo, Qatar emergency alert warmth)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1320, now + 0.12); // E6
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn("Audio notification not supported or blocked:", err);
  }
}

/**
 * Trigger urgent vibration pattern for mobile devices
 */
export function triggerHapticNotification() {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([150, 80, 250]);
    } catch {
      // Ignored
    }
  }
}

/**
 * Request permission for Web Push / Browser Notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return "denied";
    }
  }

  return Notification.permission;
}

/**
 * Display a native browser notification banner
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void }
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "harrik-parking-alert",
      dir: "rtl",
      lang: "ar",
      ...options,
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    return notification;
  } catch (err) {
    console.warn("Could not display notification:", err);
    return null;
  }
}
