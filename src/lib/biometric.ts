"use client";

/**
 * حَرِّك | HARRIK — Biometric (WebAuthn) device unlock.
 *
 * This is a *device convenience lock* layered on top of the persistent Supabase
 * session: it lets a user reopen the installed PWA with a fingerprint / Face ID
 * instead of re-typing a password. The authorization boundary remains the
 * server session; biometrics only gate the local UI.
 */

const CRED_ID_KEY = "harrik_biometric_cred_id";
const ENABLED_KEY = "harrik_biometric_enabled";
const UNLOCKED_KEY = "harrik_biometric_unlocked";

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function isBiometricSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.credentials)
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  try {
    return await (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "true" && Boolean(localStorage.getItem(CRED_ID_KEY));
}

export function isUnlockedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(UNLOCKED_KEY) === "true";
}

export function markUnlocked(): void {
  if (typeof window !== "undefined") sessionStorage.setItem(UNLOCKED_KEY, "true");
}

/**
 * Registers a platform authenticator and persists its credential id locally.
 */
export async function registerBiometric(): Promise<{ success: boolean; error?: string }> {
  if (!isBiometricSupported()) {
    return { success: false, error: "المصادقة الحيوية غير مدعومة في هذا المتصفح" };
  }

  const available = await isPlatformAuthenticatorAvailable();
  if (!available) {
    return { success: false, error: "لا يتوفر قارئ بصمة على هذا الجهاز" };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "حَرِّك | HARRIK", id: window.location.hostname },
        user: {
          id: userId,
          name: "harrik-user",
          displayName: "HARRIK User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "تم إلغاء تسجيل البصمة" };
    }

    localStorage.setItem(CRED_ID_KEY, bufferToBase64(credential.rawId));
    localStorage.setItem(ENABLED_KEY, "true");
    markUnlocked();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "تعذّر تفعيل البصمة" };
  }
}

/**
 * Prompts the platform authenticator to unlock the app for this session.
 */
export async function verifyBiometric(): Promise<{ success: boolean; error?: string }> {
  if (!isBiometricEnabled()) {
    return { success: false, error: "البصمة غير مفعّلة على هذا الجهاز" };
  }

  const rawId = localStorage.getItem(CRED_ID_KEY);
  if (!rawId) return { success: false, error: "لا يوجد تسجيل بصمة على هذا الجهاز" };

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          { id: base64ToBuffer(rawId) as unknown as BufferSource, type: "public-key" },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: "تم إلغاء التحقق بالبصمة" };
    }

    markUnlocked();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "فشل التحقق بالبصمة" };
  }
}

export function disableBiometric(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CRED_ID_KEY);
  localStorage.removeItem(ENABLED_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}
