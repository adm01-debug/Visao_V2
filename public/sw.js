// Push-only service worker. NEVER caches app shell or API responses.
// All offline / stale-content protection is handled by startBuildVersionWatcher
// in the application bundle (compares __APP_BUILD_ID__ against /version.json).

const CACHE_BLACKLIST = ['visao-v3', 'visao-static-v3', 'visao-data-v3'];

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate — purging ALL caches');
  event.waitUntil((async () => {
    try { await self.clients.claim(); } catch (_e) { /* stale worker, ignore */ }
    try {
      const cacheKeys = await caches.keys();
      const stale = cacheKeys.filter((k) => CACHE_BLACKLIST.includes(k));
      if (stale.length > 0) {
        console.log('[SW] Purging stale caches:', stale);
        await Promise.all(stale.map((key) => caches.delete(key)));
      }
    } catch (_e) { /* Cache Storage unavailable — non-fatal */ }
    // Notify all clients that a new SW is active
    const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'unknown';
    try {
      const allClients = await self.clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        client.postMessage({ type: 'SW_UPDATED', buildId });
      }
    } catch (_e) { /* no clients */ }
  })());
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'VISÃO Alert', {
      body: data.body || data.message,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'default',
      requireInteraction: data.severity === 'critical',
      data: data,
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/alertas') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/alertas');
    })
  );
});

// Message handler: skip waiting
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data.type !== 'string') return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
