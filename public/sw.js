const CACHE_NAME = 'signfast-v4';
const STATIC_CACHE = 'signfast-static-v4';
const DYNAMIC_CACHE = 'signfast-dynamic-v4';
const API_CACHE = 'signfast-api-v4';

// Ressources critiques à mettre en cache immédiatement
const CRITICAL_RESOURCES = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg'
];

// Ressources statiques à mettre en cache
const STATIC_RESOURCES = [
  '/forms',
  '/pdf/templates',
  '/pdf/manager',
  '/settings',
  '/support'
];

// Durées de cache (en millisecondes)
const CACHE_DURATIONS = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 jours
  DYNAMIC: 24 * 60 * 60 * 1000,    // 24 heures
  API: 5 * 60 * 1000,              // 5 minutes
  FORMS: 30 * 60 * 1000,           // 30 minutes
  IMAGES: 30 * 24 * 60 * 60 * 1000 // 30 jours
};

// Installation du service worker avec cache intelligent
self.addEventListener('install', (event) => {
  console.log('🔧 Installation du Service Worker v4...');
  event.waitUntil(
    Promise.all([
      // Cache critique (ressources essentielles)
      caches.open(CACHE_NAME).then((cache) => {
        console.log('✅ Cache critique ouvert');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Cache statique (ressources moins critiques)
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('✅ Cache statique ouvert');
        return cache.addAll(STATIC_RESOURCES).catch(error => {
          console.warn('⚠️ Certaines ressources statiques non disponibles:', error);
        });
      })
    ]).then(() => {
      console.log('✅ Ressources mises en cache');
      self.skipWaiting(); // Force l'activation immédiate
    }).catch((error) => {
      console.error('❌ Erreur mise en cache:', error);
    })
  );
});

// Activation du service worker avec nettoyage intelligent
self.addEventListener('activate', (event) => {
  console.log('🚀 Activation du Service Worker v4...');
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes('signfast-v4') && cacheName.includes('signfast')) {
              console.log('🗑️ Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker v4 activé');
      // Notifier les clients de la mise à jour
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_ACTIVATED', version: 'v4' });
        });
      });
    })
  );
});

// Stratégie de cache intelligente
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes vers des domaines externes
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Ignorer les requêtes POST/PUT/DELETE (sauf pour la mise en cache des réponses)
  if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
    return;
  }

  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // 1. PAGES CRITIQUES - Cache First avec fallback réseau
    if (isCriticalPage(pathname)) {
      return await cacheFirstStrategy(request, CACHE_NAME);
    }

    // 2. API SUPABASE - Network First avec cache court
    if (isSupabaseAPI(url)) {
      return await networkFirstWithShortCache(request, API_CACHE, CACHE_DURATIONS.API);
    }

    // 3. DONNÉES FORMULAIRES - Cache avec invalidation intelligente
    if (isFormsData(url)) {
      return await smartFormsCache(request, DYNAMIC_CACHE, CACHE_DURATIONS.FORMS);
    }

    // 4. IMAGES ET ASSETS - Cache Long terme
    if (isStaticAsset(pathname)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    }

    // 5. PAGES DYNAMIQUES - Network First avec cache de secours
    if (isDynamicPage(pathname)) {
      return await networkFirstStrategy(request, DYNAMIC_CACHE);
    }

    // 6. FALLBACK - Network First
    return await networkFirstStrategy(request, DYNAMIC_CACHE);

  } catch (error) {
    console.error('❌ Erreur handling request:', error);
    return await fallbackResponse(request);
  }
}

// Stratégie Cache First (pour les ressources critiques)
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('📦 Cache hit:', request.url);
    // Mise à jour en arrière-plan si la ressource est ancienne
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      console.log('🌐 Network hit, mise en cache:', request.url);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('❌ Network failed pour:', request.url);
    return await fallbackResponse(request);
  }
}

// Stratégie Network First (pour les données dynamiques)
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      console.log('🌐 Network success, mise en cache:', request.url);
      const cache = await caches.open(cacheName);
      
      // Ajouter timestamp pour gestion d'expiration
      const responseWithTimestamp = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp.clone());
      return networkResponse;
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('🌐 Network failed, tentative cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📦 Cache fallback:', request.url);
      return cachedResponse;
    }
    
    return await fallbackResponse(request);
  }
}

// Stratégie Network First avec cache court (pour les APIs)
async function networkFirstWithShortCache(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseWithTimestamp = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cached-at': Date.now().toString(),
          'sw-max-age': maxAge.toString()
        }
      });
      
      cache.put(request, responseWithTimestamp.clone());
      return networkResponse;
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isCacheExpired(cachedResponse, maxAge)) {
      console.log('📦 API cache hit (non expiré):', request.url);
      return cachedResponse;
    }
    
    return await fallbackResponse(request);
  }
}

// Cache intelligent pour les données de formulaires
async function smartFormsCache(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Vérifier si le cache est encore valide
  if (cachedResponse && !isCacheExpired(cachedResponse, maxAge)) {
    console.log('📦 Forms cache hit (valide):', request.url);
    
    // Mise à jour en arrière-plan si proche de l'expiration
    const cacheAge = getCacheAge(cachedResponse);
    if (cacheAge > maxAge * 0.8) { // 80% de la durée de vie
      updateCacheInBackground(request, cache);
    }
    
    return cachedResponse;
  }

  // Sinon, récupérer depuis le réseau
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseWithTimestamp = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp.clone());
      return networkResponse;
    }
    
    return networkResponse;
  } catch (error) {
    // Retourner le cache même expiré si le réseau échoue
    if (cachedResponse) {
      console.log('📦 Cache expiré mais réseau failed:', request.url);
      return cachedResponse;
    }
    
    return await fallbackResponse(request);
  }
}

// Mise à jour du cache en arrière-plan
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      console.log('🔄 Cache mis à jour en arrière-plan:', request.url);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.warn('⚠️ Échec mise à jour arrière-plan:', request.url);
  }
}

// Vérifier si le cache est expiré
function isCacheExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  
  const age = Date.now() - parseInt(cachedAt);
  return age > maxAge;
}

// Obtenir l'âge du cache
function getCacheAge(response) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return Infinity;
  
  return Date.now() - parseInt(cachedAt);
}

// Détecteurs de type de ressource
function isCriticalPage(pathname) {
  return ['/', '/login', '/signup', '/dashboard'].includes(pathname);
}

function isSupabaseAPI(url) {
  return url.hostname.includes('supabase') || 
         url.pathname.includes('/rest/v1/') || 
         url.pathname.includes('/functions/v1/');
}

function isFormsData(url) {
  return url.pathname.includes('/rest/v1/forms') || 
         url.pathname.includes('/rest/v1/responses') ||
         url.pathname.includes('/rest/v1/pdf_templates');
}

function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isDynamicPage(pathname) {
  return ['/forms', '/pdf', '/settings', '/support'].some(path => pathname.startsWith(path));
}

// Réponse de fallback
async function fallbackResponse(request) {
  const url = new URL(request.url);
  
  // Pour les pages, retourner la page d'accueil en cache
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAME);
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

// Notification de mise à jour disponible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Gestion des erreurs globales
self.addEventListener('error', (event) => {
  console.error('❌ Erreur Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejetée dans Service Worker:', event.reason);
});