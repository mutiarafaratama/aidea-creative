/* Push notification extension — injected into Workbox SW via importScripts */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "AideaCreative", body: event.data.text() }; }

  const title = payload.title || "AideaCreative Studio Foto";
  const options = {
    body: payload.body || "",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    vibrate: [200, 50, 200],
    data: { url: payload.url || "/profil" },
    requireInteraction: false,
    tag: payload.tag || "aidea-notif",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/profil";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => {
        try { return new URL(c.url).pathname === url || c.url.includes(url); } catch { return false; }
      });
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
