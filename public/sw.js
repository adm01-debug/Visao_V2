const CACHE_NAME = 'visao-v3';
const STATIC_CACHE = 'visao-static-v3';
const DATA_CACHE = 'visao-data-v3';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg'
];

// API routes to cache for offline
const API_ROUTES = [
  '/rest/v1/cameras',
  '/rest/v1/alerts',
  '/rest/v1/registered_persons',
  '/rest/v1/zones',
  '/rest/v1/rules'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(
        names.filter(name => 
          name !== CACHE_NAME && 
          name !== STATIC_CACHE && 
          name !== DATA_CACHE
        ).map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback for API, cache first for static
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API requests (Supabase)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
    event.respondWith(networkFirstWithCache(request, DATA_CACHE));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset) || 
      url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // Default: network first
  event.respondWith(networkFirstWithCache(request, CACHE_NAME));
});

// Network first strategy with cache fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Você está offline' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache first strategy with network fallback
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Handle messages from client
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => 
        Promise.all(names.map(name => caches.delete(name)))
      )
    );
  }

  if (event.data.type === 'CACHE_DATA') {
    const { url, data } = event.data;
    event.waitUntil(
      caches.open(DATA_CACHE).then(cache => {
        const response = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
        return cache.put(url, response);
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-alerts') {
    event.waitUntil(syncPendingAlerts());
  }
  
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Sync pending alerts when back online
async function syncPendingAlerts() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_ALERTS' });
  });
}

// Sync pending actions when back online
async function syncPendingActions() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_ACTIONS' });
  });
}

// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'VISÃO Alert', {
      body: data.body || data.message,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'default',
      requireInteraction: data.severity === 'critical',
      data: data
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes('/alertas') && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/alertas');
    })
  );
});
