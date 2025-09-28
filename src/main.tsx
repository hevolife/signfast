import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PWAManager } from './utils/pwaManager.tsx';

// Gestion d'erreur globale pour éviter l'écran blanc
window.addEventListener('error', (event) => {
  // Production: silent error handling
});

window.addEventListener('unhandledrejection', (event) => {
  // Production: silent promise rejection handling
});

// Initialiser le gestionnaire PWA
export const pwaManager = new PWAManager();

// Enregistrer le service worker pour PWA avec gestion d'erreurs améliorée et cache intelligent
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      // Initialiser le gestionnaire PWA avec l'enregistrement
      pwaManager.init(registration);
      
      // Vérifier les mises à jour
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Notifier l'utilisateur qu'une mise à jour est disponible
              pwaManager.notifyUpdateAvailable();
            }
          });
        }
      });
      
    } catch (error) {
    }
  });
  
  // Gérer les messages du service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_ACTIVATED') {
      pwaManager.handleServiceWorkerActivated(event.data);
    }
    
    if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
      pwaManager.notifyUpdateAvailable();
    }
  });
  
  // Gérer la détection PWA
  pwaManager.detectPWALaunch();
}

// Fonction de rendu avec gestion d'erreur
const renderApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Element root non trouvé');
    }
    
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    // Afficher un message d'erreur de fallback
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        ">
          <div style="
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
          ">
            <h1 style="font-size: 2rem; margin-bottom: 1rem; font-weight: bold;">
              🔧 SignFast en maintenance
            </h1>
            <p style="margin-bottom: 2rem; opacity: 0.9; line-height: 1.6;">
              Une erreur s'est produite lors du chargement de l'application. 
              Nous travaillons à résoudre ce problème.
            </p>
            <button 
              onclick="window.location.reload()" 
              style="
                background: rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.3);
                color: white;
                padding: 12px 24px;
                border-radius: 12px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
              "
              onmouseover="this.style.background='rgba(255,255,255,0.3)'"
              onmouseout="this.style.background='rgba(255,255,255,0.2)'"
            >
              🔄 Recharger la page
            </button>
            <p style="margin-top: 1rem; font-size: 0.8rem; opacity: 0.7;">
              Si le problème persiste, contactez le support
            </p>
          </div>
        </div>
      `;
    }
  }
};

// Lancer le rendu
renderApp();
