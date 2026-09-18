"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  // Check support and current subscription status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission);

    async function init() {
      try {
        // Fetch server public key & status
        const res = await fetch("/api/push/subscribe");
        if (res.ok) {
          const data = await res.json();
          if (data.publicKey) {
            setPublicKey(data.publicKey);
          }
        }

        // Check browser registration
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(subscription));
      } catch (err) {
        console.warn("Failed to check push subscription status:", err);
      }
    }

    init();
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error("إشعارات الويب غير مدعومة في هذا المتصفح");
    }

    setLoading(true);
    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error("تم رفض الإذن بإرسال الإشعارات من قبل المتصفح");
      }

      // 2. Fetch public key if not already loaded
      let key = publicKey;
      if (!key) {
        const keyRes = await fetch("/api/push/subscribe");
        const keyData = await keyRes.json();
        key = keyData.publicKey;
        setPublicKey(key);
      }

      if (!key) {
        throw new Error("تعذر الحصول على مفتاح التشفير VAPID العام");
      }

      // 3. Register push with Service Worker
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      // 4. Save to backend database
      const subJson = subscription.toJSON();
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || "فشل تسجيل الاشتراك في الخادم");
      }

      setIsSubscribed(true);
      return true;
    } finally {
      setLoading(false);
    }
  }, [isSupported, publicKey]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
    } catch (err) {
      console.warn("Failed to unsubscribe:", err);
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
}
