import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enregistrer le service worker pour PWA avec gestion d'erreurs améliorée
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker enregistré avec succès:', registration.scope);
      
      // Vérifier les mises à jour
      registration.addEventListener('updatefound', () => {
        console.log('🔄 Nouvelle version du Service Worker disponible');
      });
      
    } catch (error) {
      console.warn('❌ Échec enregistrement Service Worker:', error);
    }
  });
  
  // Gérer les messages du service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
      console.log('🔄 Mise à jour PWA disponible');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
