import React from 'react';
import toast from 'react-hot-toast';

export class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  init(registration: ServiceWorkerRegistration) {
    this.registration = registration;
  }

  detectPWALaunch() {
    const isPWA = this.isPWAMode();
    if (isPWA) {
      this.handlePWALaunch();
    }
  }

  isPWAMode(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('utm_source=pwa')
    );
  }

  private handlePWALaunch() {
    const hasValidSession = this.checkValidSession();
    if (!hasValidSession) {
      this.redirectToLogin();
    } else {
      this.handleValidSession();
    }
  }

  private checkValidSession(): boolean {
    try {
      const supabaseToken = localStorage.getItem('sb-auth-token');
      if (!supabaseToken) return false;

      const tokenData = JSON.parse(supabaseToken);
      if (tokenData.expires_at) {
        const expiresAt = new Date(tokenData.expires_at);
        if (new Date() >= expiresAt) {
          return false;
        }
      }
      return Boolean(tokenData.user?.id);
    } catch (error) {
      return false;
    }
  }

  private redirectToLogin() {
    this.clearSessionData();
    if (
      window.location.pathname !== '/login' &&
      window.location.pathname !== '/signup'
    ) {
      window.location.href = '/login?pwa=true';
    }
  }

  private handleValidSession() {
    if (this.isPWAMode() && !sessionStorage.getItem('pwa_welcome_shown')) {
      sessionStorage.setItem('pwa_welcome_shown', 'true');
      setTimeout(() => {
        toast.success('📱 SignFast PWA activé !', {
          duration: 3000,
          icon: '🚀',
        });
      }, 1000);
    }
  }

  clearSessionData() {
    try {
      localStorage.removeItem('sb-auth-token');
      localStorage.removeItem('currentUserForms');
      sessionStorage.clear();
      this.clearAppCache();
    } catch (error) {
      // Production: silent error handling
    }
  }

  async clearAppCache() {
    try {
      if ('serviceWorker' in navigator && this.registration) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          // Production: silent cache cleanup
        };
        this.registration.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      }
    } catch (error) {
      // Production: silent error handling
    }
  }

  notifyUpdateAvailable() {
    if (this.updateAvailable) return;
    this.updateAvailable = true;

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
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
      ),
      {
        duration: 10000,
        position: 'top-center',
      }
    );
  }

  async applyUpdate() {
    try {
      if (this.registration?.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => window.location.reload(), 1000);
        toast.loading('🔄 Mise à jour en cours...', { duration: 2000 });
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }

  handleServiceWorkerActivated(data: any) {
    if (this.isPWAMode() && !sessionStorage.getItem('offline_ready_shown')) {
      sessionStorage.setItem('offline_ready_shown', 'true');
      setTimeout(() => {
        toast.success('📱 Application prête pour utilisation hors ligne', {
          duration: 4000,
          icon: '🔋',
        });
      }, 2000);
    }
  }

  async getCacheInfo() {
    return new Promise((resolve) => {
      if (!this.registration?.active) {
        resolve({ error: 'Service Worker non actif' });
        return;
      }
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => resolve(event.data);
      this.registration.active.postMessage(
        { type: 'GET_CACHE_INFO' },
        [messageChannel.port2]
      );
    });
  }

  async preloadCriticalResources() {
    try {
      const urls = ['/dashboard', '/forms', '/pdf/manager', '/settings'];
      for (const url of urls) {
        fetch(url, { mode: 'no-cors' }).catch(() => {});
      }
    } catch (error) {
    }
  }

  handleLogout() {
    this.clearSessionData();
    window.location.href = this.isPWAMode()
      ? '/login?pwa=true&logout=true'
      : '/';
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  setupConnectivityListener() {
    window.addEventListener('online', () => {
      toast.success('Connexion rétablie', { duration: 2000, icon: '🌐' });
    });
    window.addEventListener('offline', () => {
      toast('Mode hors ligne activé', { duration: 3000, icon: '📱' });
    });
  }
}

export const pwaManager = new PWAManager();

if (typeof window !== 'undefined') {
  pwaManager.setupConnectivityListener();
}