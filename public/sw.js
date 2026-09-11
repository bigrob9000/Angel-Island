const CACHE = "angel-island-shell-v7";
const PRECACHE = ["/", "/manifest.webmanifest", "/angel-island-mark-light.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        const fallback = await caches.match("/");
        if (fallback) return fallback;
      }
      throw new Error("Offline");
    }),
  );
});

function askClientUserId(client) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 150);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(typeof event.data === "string" ? event.data : null);
    };
    client.postMessage({ type: "push-get-user-id" }, [channel.port2]);
  });
}

async function shouldSuppressNotification(payload) {
  const senderId = payload.senderId;
  const recipientId = payload.recipientId;
  if (!senderId) return false;

  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (clients.length === 0) {
    return false;
  }

  let hasRecipientClient = false;
  let hasSenderClient = false;

  for (const client of clients) {
    const userId = await askClientUserId(client);
    if (recipientId && userId === recipientId) {
      hasRecipientClient = true;
    }
    if (userId === senderId) {
      hasSenderClient = true;
    }
  }

  if (hasRecipientClient) {
    return false;
  }

  return hasSenderClient;
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }

  event.waitUntil(
    (async () => {
      if (await shouldSuppressNotification(payload)) {
        return;
      }

      const title = payload.title || "Angel Island";
      await self.registration.showNotification(title, {
        body: payload.body || "You have a new message.",
        icon: "/angel-island-mark-light.png",
        badge: "/angel-island-mark-light.png",
        data: { url: payload.url || "/messages" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/messages";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
