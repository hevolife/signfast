import toast from 'react-hot-toast';

export class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  init(registration: ServiceWorkerRegistration) {
    this.registration = registration;
    console.log('🔧 PWA Manager initialisé');
  }

  // Détecter si l'app est lancée en mode PWA
  detectPWALaunch() {
    const isPWA = this.isPWAMode();
    
    if (isPWA) {
      console.log('📱 Application lancée en mode PWA');
      this.handlePWALaunch();
    } else {
      console.log('🌐 Application lancée en mode navigateur');
    }
  }

  // Vérifier si on est en mode PWA
  isPWAMode(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('utm_source=pwa')
    );
  }

  // Gérer le lancement PWA
  private handlePWALaunch() {
    // Vérifier l'état de connexion
    const hasValidSession = this.checkValidSession();
    
    if (!hasValidSession) {
      console.log('📱 PWA: Aucune session valide, redirection vers login');
      this.redirectToLogin();
    } else {
      console.log('📱 PWA: Session valide détectée');
      this.handleValidSession();
    }
  }

  // Vérifier si une session valide existe
  private checkValidSession(): boolean {
    try {
      // Vérifier le token Supabase
      const supabaseToken = localStorage.getItem('sb-auth-token');
      if (!supabaseToken) {
        return false;
      }

      const tokenData = JSON.parse(supabaseToken);
      
      // Vérifier l'expiration du token
      if (tokenData.expires_at) {
        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();
        
        if (now >= expiresAt) {
          console.log('📱 Token expiré');
          return false;
        }
      }

      // Vérifier que l'utilisateur existe
      if (!tokenData.user || !tokenData.user.id) {
        return false;
      }

      console.log('📱 Session valide trouvée pour:', tokenData.user.email);
      return true;
    } catch (error) {
      console.warn('📱 Erreur vérification session:', error);
      return false;
    }
  }

  // Rediriger vers la page de connexion
  private redirectToLogin() {
    // Nettoyer les données de session corrompues
    this.clearSessionData();
    
    // Rediriger vers login si pas déjà sur cette page
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
      console.log('📱 Redirection PWA vers /login');
      window.location.href = '/login?pwa=true';
    }
  }

  // Gérer une session valide
  private handleValidSession() {
    // Optionnel: afficher un message de bienvenue PWA
    if (this.isPWAMode() && !sessionStorage.getItem('pwa_welcome_shown')) {
      sessionStorage.setItem('pwa_welcome_shown', 'true');
      
      setTimeout(() => {
        toast.success('📱 SignFast PWA activé !', {
          duration: 3000,
          icon: '🚀'
        });
      }, 1000);
    }
  }

  // Nettoyer les données de session
  clearSessionData() {
    try {
      localStorage.removeItem('sb-auth-token');
      localStorage.removeItem('currentUserForms');
      sessionStorage.clear();
      
      // Nettoyer le cache si possible
      this.clearAppCache();
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage session:', error);
    }
  }

  // Nettoyer le cache de l'application
  async clearAppCache() {
    try {
      if ('serviceWorker' in navigator && this.registration) {
        // Envoyer un message au service worker pour nettoyer le cache
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            console.log('✅ Cache PWA nettoyé');
          }
        };

        this.registration.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      }
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage cache PWA:', error);
    }
  }

  // Notifier qu'une mise à jour est disponible
  notifyUpdateAvailable() {
    if (this.updateAvailable) return; // Éviter les notifications multiples
    
    this.updateAvailable = true;
    
    toast.custom((t) => (
      <div className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-white text-lg">🔄</span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-white">
                Mise à jour disponible
              </p>
              <p className="mt-1 text-sm text-white/90">
                Une nouvelle version de SignFast est prête
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/20">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              this.applyUpdate();
            }}
            className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Mettre à jour
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'top-center',
    });
  }

  // Appliquer la mise à jour
  async applyUpdate() {
    try {
      if (this.registration?.waiting) {
        console.log('🔄 Application de la mise à jour...');
        
        // Dire au service worker en attente de prendre le contrôle
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Recharger la page après un court délai
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        toast.loading('🔄 Mise à jour en cours...', { duration: 2000 });
      }
    } catch (error) {
      console.error('❌ Erreur application mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }

  // Gérer l'activation du service worker
  handleServiceWorkerActivated(data: any) {
    console.log('🚀 Service Worker activé:', data.version);
    
    // Optionnel: notifier l'utilisateur que l'app est prête pour une utilisation hors ligne
    if (this.isPWAMode() && !sessionStorage.getItem('offline_ready_shown')) {
      sessionStorage.setItem('offline_ready_shown', 'true');
      
      setTimeout(() => {
        toast.success('📱 Application prête pour utilisation hors ligne', {
          duration: 4000,
          icon: '🔋'
        });
      }, 2000);
    }
  }

  // Obtenir les informations de cache
  async getCacheInfo() {
    return new Promise((resolve) => {
      if (!this.registration?.active) {
        resolve({ error: 'Service Worker non actif' });
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration.active.postMessage(
        { type: 'GET_CACHE_INFO' },
        [messageChannel.port2]
      );
    });
  }

  // Précharger les ressources importantes
  async preloadCriticalResources() {
    try {
      const criticalUrls = [
        '/dashboard',
        '/forms',
        '/pdf/manager',
        '/settings'
      ];

      for (const url of criticalUrls) {
        fetch(url, { mode: 'no-cors' }).catch(() => {
          // Ignorer les erreurs de préchargement
        });
      }
      
      console.log('🚀 Préchargement des ressources critiques lancé');
    } catch (error) {
      console.warn('⚠️ Erreur préchargement:', error);
    }
  }

  // Gérer la déconnexion PWA
  handleLogout() {
    console.log('📱 Gestion déconnexion PWA');
    
    // Nettoyer les données
    this.clearSessionData();
    
    // Rediriger vers login en mode PWA
    if (this.isPWAMode()) {
      window.location.href = '/login?pwa=true&logout=true';
    } else {
      window.location.href = '/';
    }
  }

  // Vérifier la connectivité
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Écouter les changements de connectivité
  setupConnectivityListener() {
    window.addEventListener('online', () => {
      console.log('🌐 Connexion rétablie');
      toast.success('Connexion rétablie', {
        duration: 2000,
        icon: '🌐'
      });
    });

    window.addEventListener('offline', () => {
      console.log('📱 Mode hors ligne activé');
      toast('Mode hors ligne activé', {
        duration: 3000,
        icon: '📱'
      });
    });
  }
}

// Instance globale
export const pwaManager = new PWAManager();

// Initialiser les listeners de connectivité
if (typeof window !== 'undefined') {
  pwaManager.setupConnectivityListener();
}