const CACHE_NAME = 'signfast-v3';
const urlsToCache = [
  '/',
  '/dashboard',
  '/forms',
  '/pdf/templates',
  '/pdf/manager',
  '/settings',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Installation du Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache ouvert:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Ressources mises en cache');
        self.skipWaiting(); // Force l'activation immédiate
      })
      .catch((error) => {
        console.error('❌ Erreur mise en cache:', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Activation du Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activé');
      self.clients.claim(); // Prendre le contrôle immédiatement
    })
  );
});

// Interception des requêtes avec stratégie Network First pour les API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes vers des domaines externes (Supabase, etc.)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }
  
  // Stratégie Network First pour les pages importantes
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'document' ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('/functions/')) {
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la réponse est valide, la mettre en cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // En cas d'échec réseau, essayer le cache
          return caches.match(event.request);
        })
    );
  } else {
    // Stratégie Cache First pour les assets statiques
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          });
        })
    );
  }
});

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification de mise à jour disponible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});