const CACHE_NAME = 'signfast-v5';
const STATIC_CACHE = 'signfast-static-v5';

// Ressources statiques uniquement (pas de données dynamiques)
const STATIC_RESOURCES = [
  '/',
  '/login',
  '/signup',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg'
];

// Durées de cache (en millisecondes) - très courtes pour les données
const CACHE_DURATIONS = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 jours pour les assets
  IMAGES: 30 * 24 * 60 * 60 * 1000 // 30 jours pour les images
};

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_RESOURCES).catch(error => {
        // Production: silent error handling
      });
    }).then(() => {
      self.skipWaiting();
    }).catch((error) => {
      // Production: silent error handling
    })
  );
});

// Activation du service worker avec nettoyage
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes('signfast-v5') && cacheName.includes('signfast')) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ]).then(() => {
      // Production: Service Worker activated
    })
  );
});

// Stratégie simplifiée : cache UNIQUEMENT pour les assets statiques
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes vers des domaines externes
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Ignorer les requêtes POST/PUT/DELETE
  if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
    return;
  }

  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // 1. ASSETS STATIQUES UNIQUEMENT - Cache First
    if (isStaticAsset(pathname)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    }

    // 2. PAGES STATIQUES (HTML) - Cache First avec mise à jour en arrière-plan
    if (isStaticPage(pathname)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    }

    // 3. TOUTES LES DONNÉES DYNAMIQUES - Network Only (pas de cache)
    if (isSupabaseAPI(url) || isDynamicData(url)) {
      return await fetch(request);
    }

    // 4. FALLBACK - Network Only
    return await fetch(request);

  } catch (error) {
    return await fallbackResponse(request);
  }
}

// Stratégie Cache First (pour les assets statiques uniquement)
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Mise à jour en arrière-plan pour les assets
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return await fallbackResponse(request);
  }
}

// Mise à jour du cache en arrière-plan (assets uniquement)
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Production: silent error handling
  }
}

// Détecteurs de type de ressource
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/);
}

function isStaticPage(pathname) {
  // Pages statiques de base uniquement
  return ['/', '/login', '/signup'].includes(pathname);
}

function isSupabaseAPI(url) {
  return url.hostname.includes('supabase') || 
         url.pathname.includes('/rest/v1/') || 
         url.pathname.includes('/functions/v1/');
}

function isDynamicData(url) {
  // Toutes les données de l'application sont considérées comme dynamiques
  return url.pathname.includes('/rest/v1/') || 
         url.pathname.includes('/functions/v1/') ||
         url.pathname.includes('/dashboard') ||
         url.pathname.includes('/forms') ||
         url.pathname.includes('/pdf') ||
         url.pathname.includes('/settings') ||
         url.pathname.includes('/support');
}

// Réponse de fallback
async function fallbackResponse(request) {
  const url = new URL(request.url);
  
  // Pour les pages, retourner la page d'accueil en cache si disponible
  if (request.mode === 'navigate') {
    const cache = await caches.open(STATIC_CACHE);
    const fallback = await cache.match('/');
    if (fallback) {
      return fallback;
    }
  }
  
  // Pour les autres ressources, retourner une réponse d'erreur
  return new Response(
    JSON.stringify({ error: 'Resource not available offline' }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Nettoyer tous les caches
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.includes('signfast')) {
            console.log('🗑️ Nettoyage cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Tous les caches nettoyés');
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    // Retourner les informations de cache
    getCacheInfo().then(info => {
      event.ports[0].postMessage(info);
    });
  }
});

// Obtenir les informations de cache
async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {
    version: CACHE_NAME,
    caches: [],
    totalSize: 0
  };
  
  for (const cacheName of cacheNames) {
    if (cacheName.includes('signfast')) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      let cacheSize = 0;
      for (const key of keys) {
        try {
          const response = await cache.match(key);
          if (response) {
            const blob = await response.blob();
            cacheSize += blob.size;
          }
        } catch (error) {
          // Ignorer les erreurs de taille
        }
      }
      
      info.caches.push({
        name: cacheName,
        entries: keys.length,
        size: cacheSize
      });
      info.totalSize += cacheSize;
    }
  }
  
  return info;
}

// Gestion des erreurs globales
self.addEventListener('error', (event) => {
  console.error('❌ Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejetée dans Service Worker:', event.reason);
});