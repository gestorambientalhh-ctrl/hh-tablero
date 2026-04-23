const CACHE_NAME = 'hh-tablero-v4';
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase y APIs externas: siempre red, nunca caché
  if (url.hostname.includes('firestore') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('script.google')) {
    return;
  }

  // index.html: SIEMPRE de la red para garantizar versión fresca
  // Si falla la red, usar caché como fallback
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          // Notificar a todos los clientes que hay versión nueva
          self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }));
          });
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Recursos estáticos (íconos, manifest): caché primero
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Responder al mensaje SKIP_WAITING
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
