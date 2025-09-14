/**
 * Système de cache intelligent pour optimiser les performances
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en millisecondes
  key: string;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enablePersistence: boolean;
}

export class IntelligentCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private persistenceKey = 'signfast_cache';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes par défaut
      maxSize: 100, // 100 entrées max
      enablePersistence: true,
      ...config
    };

    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    // Nettoyage automatique toutes les minutes
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Vérifier si l'item a expiré
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    console.log('📦 Cache HIT:', key);
    return item.data;
  }

  /**
   * Stocke une valeur dans le cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Vérifier la taille du cache
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key
    };

    this.cache.set(key, item);
    console.log('📦 Cache SET:', key, `(TTL: ${item.ttl / 1000}s)`);

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Invalide une entrée du cache
   */
  invalidate(key: string): void {
    if (this.cache.delete(key)) {
      console.log('📦 Cache INVALIDATE:', key);
      this.saveToStorage();
    }
  }

  /**
   * Invalide toutes les entrées correspondant à un pattern
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log('📦 Cache INVALIDATE PATTERN:', key);
    });

    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear();
    console.log('📦 Cache CLEAR ALL');
    this.saveToStorage();
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log('📦 Cache CLEANUP:', keysToDelete.length, 'entrées expirées supprimées');
      this.saveToStorage();
    }
  }

  /**
   * Supprime l'entrée la plus ancienne
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log('📦 Cache EVICT:', oldestKey);
    }
  }

  /**
   * Sauvegarde le cache dans localStorage
   */
  private saveToStorage(): void {
    if (!this.config.enablePersistence) return;

    try {
      const cacheData = Array.from(this.cache.entries()).map(([key, item]) => [key, item]);
      localStorage.setItem(this.persistenceKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('📦 Erreur sauvegarde cache:', error);
    }
  }

  /**
   * Charge le cache depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.persistenceKey);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();

        cacheData.forEach(([key, item]: [string, CacheItem<any>]) => {
          // Vérifier si l'item n'a pas expiré
          if (now - item.timestamp <= item.ttl) {
            this.cache.set(key, item);
          }
        });

        console.log('📦 Cache chargé depuis localStorage:', this.cache.size, 'entrées');
      }
    } catch (error) {
      console.warn('📦 Erreur chargement cache:', error);
    }
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      defaultTTL: this.config.defaultTTL,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Instance globale du cache
export const cache = new IntelligentCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  enablePersistence: true
});

// Cache spécialisés avec TTL différents
export const formsCache = new IntelligentCache({
  defaultTTL: 2 * 60 * 1000, // 2 minutes pour les formulaires (données qui changent souvent)
  maxSize: 30,
  enablePersistence: true
});

export const templatesCache = new IntelligentCache({
  defaultTTL: 10 * 60 * 1000, // 10 minutes pour les templates (données plus stables)
  maxSize: 20,
  enablePersistence: true
});

export const userCache = new IntelligentCache({
  defaultTTL: 15 * 60 * 1000, // 15 minutes pour les données utilisateur
  maxSize: 10,
  enablePersistence: true
});

/**
 * Wrapper pour les requêtes avec cache automatique
 */
export async function cachedRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl?: number,
  cacheInstance: IntelligentCache = cache
): Promise<T> {
  // Essayer de récupérer depuis le cache
  const cached = cacheInstance.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  try {
    // Exécuter la requête
    console.log('📦 Cache MISS, exécution requête:', key);
    const result = await requestFn();
    
    // Stocker dans le cache
    cacheInstance.set(key, result, ttl);
    
    return result;
  } catch (error) {
    console.error('📦 Erreur requête cachée:', key, error);
    throw error;
  }
}