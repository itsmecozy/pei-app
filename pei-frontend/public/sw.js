// PEI Service Worker - handles background push notifications
const CACHE_NAME = "pei-sw-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications from server (future)
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "PEI — How are you feeling?";
  const options = {
    body:    data.body || "Take a moment to log your emotion for today.",
    icon:    "/favicon.ico",
    badge:   "/favicon.ico",
    tag:     "pei-reminder",
    renotify: true,
    data:    { url: data.url || "/#home" },
    actions: [
      { action: "submit", title: "Log feeling" },
      { action: "dismiss", title: "Later" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const url = event.notification.data?.url || "/";
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "OPEN_SUBMIT_MODAL" });
          return;
        }
      }
      clients.openWindow(url);
    })
  );
});

// Handle scheduled alarm messages from the app
self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_NOTIFICATION") {
    const { times } = event.data;
    // Store times in SW scope
    self.notifTimes = times;
    scheduleNext(times);
  }
  if (event.data?.type === "CANCEL_NOTIFICATIONS") {
    if (self.notifTimeout) clearTimeout(self.notifTimeout);
  }
});

function scheduleNext(times) {
  if (self.notifTimeout) clearTimeout(self.notifTimeout);
  if (!times || !times.length) return;

  const now    = new Date();
  const today  = now.getTime();

  // Find the next upcoming time across all configured times
  let nearest = null;
  for (const t of times) {
    const [h, m] = t.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= today) target.setDate(target.getDate() + 1);
    if (!nearest || target.getTime() < nearest.getTime()) nearest = target;
  }

  if (!nearest) return;
  const msUntil = nearest.getTime() - today;

  self.notifTimeout = setTimeout(async () => {
    try {
      await self.registration.showNotification("PEI — How are you feeling?", {
        body:     "Take a moment to log your emotion for today.",
        icon:     "/favicon.ico",
        badge:    "/favicon.ico",
        tag:      "pei-reminder",
        renotify: true,
        data:     { url: "/#home" },
        actions:  [
          { action: "submit",  title: "Log feeling" },
          { action: "dismiss", title: "Later" },
        ],
      });
    } catch (e) {
      console.warn("SW notification failed:", e);
    }
    // Schedule next occurrence
    scheduleNext(self.notifTimes || times);
  }, msUntil);
}
