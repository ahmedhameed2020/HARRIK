// HARRIK Service Worker v5 — PWA caching + reliable Web Push
const CACHE_NAME = "harrik-cache-v5";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Event (Network first, fallback to cache; never cache sensitive routes)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/auth/v1/") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/platform") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/profile") ||
    url.pathname.startsWith("/inbox") ||
    url.pathname.startsWith("/scan")
  ) {
    return;
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
        return new Response("Network error occurred", { status: 408 });
      })
  );
});

// Notification Click — open the deep link carried by the push payload
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/inbox";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === "/inbox" || clientUrl.pathname === "/") {
            if ("focus" in client) {
              if ("navigate" in client) client.navigate(targetUrl).catch(() => {});
              return client.focus();
            }
          }
        } catch {
          // ignore malformed client urls
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// Push Event — always surface a notification, even when the app is closed
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "تنبيه مواقف حَرِّك", body: event.data && event.data.text ? event.data.text() : "تنبيه جديد" };
  }

  const title = data.title || "تنبيه مواقف حَرِّك";
  const options = {
    body: data.body || "لديك تنبيه جديد لتحريك سيارتك في المواقف",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "harrik-parking-alert",
    renotify: true,
    dir: "rtl",
    lang: "ar",
    vibrate: [150, 80, 250],
    data: { url: data.url || "/inbox" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Keep the subscription alive if the browser rotates it
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const applicationServerKey = event.oldSubscription
          ? event.oldSubscription.options.applicationServerKey
          : undefined;

        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        const subJson = newSubscription.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: {
              endpoint: newSubscription.endpoint,
              keys: { p256dh: subJson.keys && subJson.keys.p256dh, auth: subJson.keys && subJson.keys.auth },
            },
            userAgent: navigator.userAgent,
          }),
        });
      } catch {
        // best-effort; the client hook will re-register on next launch
      }
    })()
  );
});
