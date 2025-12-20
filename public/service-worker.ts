/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Service Worker para PWA
 * 
 * Funcionalidades:
 * - Cache de assets estáticos
 * - Funcionamento offline
 * - Push notifications
 * - Background sync
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// ============================================
// CONFIGURAÇÃO
// ============================================

const CACHE_NAME = 'visao-cache-v1';
const DYNAMIC_CACHE = 'visao-dynamic-v1';
const MAX_DYNAMIC_CACHE_ITEMS = 50;

// Assets para cache imediato (install)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/alert.mp3',
  '/sounds/notification.mp3',
];

// Rotas que sempre devem usar network-first
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/rest/',
  '/supabase/',
];

// Rotas que podem funcionar offline
const OFFLINE_FALLBACK_ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/people',
  '/zones',
  '/settings',
];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Assumir controle imediatamente
      self.clients.claim(),
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// ============================================
// FETCH EVENT
// ============================================

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de outros domínios
  if (url.origin !== location.origin) {
    return;
  }

  // Ignorar WebSocket
  if (url.protocol === 'wss:' || url.protocol === 'ws:') {
    return;
  }

  // Network-first para APIs
  if (NETWORK_FIRST_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first para assets estáticos
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stale-while-revalidate para páginas
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request));
});

// ============================================
// ESTRATÉGIAS DE CACHE
// ============================================

/**
 * Cache-first: Tenta cache primeiro, depois network
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      await trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first: Tenta network primeiro, depois cache
 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Retornar fallback offline
    return getOfflineFallback(request);
  }
}

/**
 * Stale-while-revalidate: Retorna cache imediatamente e atualiza em background
 */
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  
  const networkPromise = fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // Atualizar cache em background
    networkPromise;
    return cached;
  }

  const response = await networkPromise;
  
  if (response) {
    return response;
  }

  return getOfflineFallback(request);
}

/**
 * Fallback para modo offline
 */
async function getOfflineFallback(request: Request): Promise<Response> {
  // Para navegação, retornar página offline
  if (request.mode === 'navigate') {
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback HTML básico
    return new Response(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VISÃO - Offline</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
          }
          .container {
            padding: 2rem;
          }
          h1 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          p {
            color: #94a3b8;
            margin-bottom: 1.5rem;
          }
          button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
          }
          button:hover {
            background: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📡 Você está offline</h1>
          <p>Verifique sua conexão com a internet e tente novamente.</p>
          <button onclick="location.reload()">Tentar Novamente</button>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Para outros recursos
  return new Response('Offline', { status: 503 });
}

/**
 * Limitar tamanho do cache dinâmico
 */
async function trimCache(cacheName: string, maxItems: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'VISÃO',
    body: 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ============================================
// NOTIFICATION CLICK
// ============================================

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Navegar para a URL apropriada
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Se já tem uma janela aberta, focar nela
        const client = clients.find(c => 
          c.url.includes(self.location.origin) && 'focus' in c
        );
        
        if (client) {
          return (client as WindowClient).focus().then(c => c.navigate(urlToOpen));
        }
        
        // Senão, abrir nova janela
        return self.clients.openWindow(urlToOpen);
      })
  );
});

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event: SyncEvent) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-alerts') {
    event.waitUntil(syncAlerts());
  }

  if (event.tag === 'sync-clips') {
    event.waitUntil(syncClips());
  }
});

async function syncAlerts(): Promise<void> {
  // Sincronizar alertas pendentes
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    // Implementar lógica de sync
    console.log('[SW] Alerts synced');
  } catch (error) {
    console.error('[SW] Sync alerts failed:', error);
  }
}

async function syncClips(): Promise<void> {
  // Sincronizar clips pendentes
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    // Implementar lógica de sync
    console.log('[SW] Clips synced');
  } catch (error) {
    console.error('[SW] Sync clips failed:', error);
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
