// HARRIK Service Worker v1.0
const CACHE_NAME = "harrik-cache-v4";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network first, fallback to cache for navigations/assets, ignore API calls)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Do not cache API requests, Supabase traffic, auth, or sensitive authenticated routes
  // (profiles, vehicles, phone numbers, visitors, audit logs, reports, platform control)
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

  // Handle GET requests only
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response to put in cache
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
        // If navigating to a page offline, return root shell
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
        return new Response("Network error occurred", { status: 408 });
      })
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing inbox window if open
      for (const client of clientList) {
        if (client.url.includes("/inbox") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window to /inbox
      if (clients.openWindow) {
        return clients.openWindow("/inbox");
      }
    })
  );
});

// Push Event Handler (for Web Push)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "تنبيه مواقف حَرِّك", body: event.data?.text() || "تنبيه جديد" };
  }

  const title = data.title || "تنبيه مواقف حَرِّك";
  const options = {
    body: data.body || "لديك تنبيه جديد لتحريك سيارتك في المواقف",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "harrik-parking-alert",
    dir: "rtl",
    lang: "ar",
    vibrate: [150, 80, 250],
    data: {
      url: data.url || "/inbox",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
