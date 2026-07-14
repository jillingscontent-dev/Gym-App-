// Notification-only service worker for the rest timer.
// Intentionally has no fetch handler: the app stays online-first and this
// worker can never serve stale cached code.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
      const existing = windows[0];
      return existing ? existing.focus() : self.clients.openWindow("./");
    })
  );
});
