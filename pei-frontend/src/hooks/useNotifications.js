import { useState, useEffect } from "react";

const NOTIF_KEY       = "pei_notif_enabled";
const NOTIF_TIMES_KEY = "pei_notif_times";

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [swReady, setSwReady] = useState(false);

  // Register service worker once on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        setSwReady(true);
        // If notifications were already enabled, reschedule on page load
        const enabled = localStorage.getItem(NOTIF_KEY) === "true";
        const times   = JSON.parse(localStorage.getItem(NOTIF_TIMES_KEY) || '["20:00"]');
        if (enabled && Notification.permission === "granted") {
          sendScheduleMessage(reg, times);
        }
      })
      .catch((err) => console.warn("SW registration failed:", err));
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const enable = async (times) => {
    let perm = permission;
    if (perm === "default") {
      perm = await requestPermission();
    }
    if (perm !== "granted") return false;

    localStorage.setItem(NOTIF_KEY, "true");
    localStorage.setItem(NOTIF_TIMES_KEY, JSON.stringify(times));

    if (!("serviceWorker" in navigator)) {
      // Fallback to setTimeout for desktop browsers without SW
      scheduleWithTimeout(times);
      return true;
    }

    const reg = await navigator.serviceWorker.ready;
    sendScheduleMessage(reg, times);
    return true;
  };

  const disable = async () => {
    localStorage.setItem(NOTIF_KEY, "false");
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: "CANCEL_NOTIFICATIONS" });
    }
    // Clear any setTimeout fallbacks
    const ids = JSON.parse(localStorage.getItem("pei_notif_ids") || "[]");
    ids.forEach(id => clearTimeout(id));
    localStorage.setItem("pei_notif_ids", "[]");
  };

  const updateTimes = async (times) => {
    localStorage.setItem(NOTIF_TIMES_KEY, JSON.stringify(times));
    const enabled = localStorage.getItem(NOTIF_KEY) === "true";
    if (!enabled || permission !== "granted") return;
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      sendScheduleMessage(reg, times);
    } else {
      scheduleWithTimeout(times);
    }
  };

  return { permission, swReady, enable, disable, updateTimes, requestPermission };
}

function sendScheduleMessage(reg, times) {
  const target = reg.active || reg.installing || reg.waiting;
  if (target) {
    target.postMessage({ type: "SCHEDULE_NOTIFICATION", times });
  } else {
    // SW not active yet — wait for it
    navigator.serviceWorker.ready.then(r => {
      r.active?.postMessage({ type: "SCHEDULE_NOTIFICATION", times });
    });
  }
}

// setTimeout fallback for browsers where SW isn't available
function scheduleWithTimeout(times) {
  const ids = JSON.parse(localStorage.getItem("pei_notif_ids") || "[]");
  ids.forEach(id => clearTimeout(id));

  const now = Date.now();
  const newIds = times.map(time => {
    const [h, m] = time.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now;
    return setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification("PEI — How are you feeling?", {
          body: "Take a moment to log your emotion for today.",
          icon: "/favicon.ico",
        });
      }
      scheduleWithTimeout(times);
    }, ms);
  });

  localStorage.setItem("pei_notif_ids", JSON.stringify(newIds));
}
