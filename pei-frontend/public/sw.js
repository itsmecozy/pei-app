// PEI Service Worker v2
// Reliable cross-device notification scheduling

const SW_VERSION = "pei-sw-v2";

self.addEventListener("install", () => self.skipWaiting());

// ── On SW activation, restore schedule from cache ─────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    clients.claim().then(() =>
      caches.open(SW_VERSION).then(async cache => {
        const res = await cache.match("notif-times");
        if (res) {
          const times = await res.json();
          scheduleNext(times);
        }
      })
    )
  );
});

// ── Notification click handler ─────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "OPEN_SUBMIT_MODAL" });
          return;
        }
      }
      return clients.openWindow("/");
    })
  );
});

// ── Message handler from app ───────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_NOTIFICATION") {
    const times = event.data.times || ["20:00"];
    caches.open(SW_VERSION).then(cache => {
      cache.put("notif-times", new Response(JSON.stringify(times)));
    });
    scheduleNext(times);
  }

  if (event.data?.type === "CANCEL_NOTIFICATIONS") {
    if (self._notifTimer) { clearTimeout(self._notifTimer); self._notifTimer = null; }
    caches.open(SW_VERSION).then(cache => cache.delete("notif-times"));
  }

  if (event.data?.type === "TEST_NOTIFICATION") {
    self.registration.showNotification("PEI — Test 🔥", {
      body: "Notifications are working on your device!",
      icon: "/favicon.ico",
      tag:  "pei-test",
    });
  }
});

// ── Core scheduling ────────────────────────────────────────────────────────
function scheduleNext(times) {
  if (self._notifTimer) clearTimeout(self._notifTimer);
  if (!times?.length) return;

  const now = Date.now();
  let nearest = null;

  for (const t of times) {
    const [h, m] = t.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now) target.setDate(target.getDate() + 1);
    if (!nearest || target.getTime() < nearest.getTime()) nearest = target;
  }

  if (!nearest) return;
  const ms = nearest.getTime() - now;

  self._notifTimer = setTimeout(async () => {
    try {
      await self.registration.showNotification("PEI — How are you feeling?", {
        body:     "Take a moment to log your emotion for today.",
        icon:     "/favicon.ico",
        badge:    "/favicon.ico",
        tag:      "pei-reminder",
        renotify: true,
        data:     { url: "/" },
        actions:  [
          { action: "open",    title: "Log feeling" },
          { action: "dismiss", title: "Later" },
        ],
      });
    } catch (e) {
      console.warn("[PEI SW] Notification failed:", e);
    }
    scheduleNext(times);
  }, ms);
}
