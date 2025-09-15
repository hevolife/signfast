import React, { useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageCircle, Bell } from 'lucide-react';

export const SupportNotificationToast: React.FC = () => {
  const { unreadSupportMessages } = useNotifications();
  const location = useLocation();
  const [lastNotificationCount, setLastNotificationCount] = React.useState(0);

  useEffect(() => {
    // Ne pas afficher de notification si on est déjà sur la page support
    if (location.pathname === '/support') {
      setLastNotificationCount(unreadSupportMessages);
      return;
    }

    // Afficher une notification seulement si le nombre a augmenté
    if (unreadSupportMessages > lastNotificationCount && lastNotificationCount >= 0) {
      const newMessages = unreadSupportMessages - lastNotificationCount;
      
      if (newMessages > 0) {
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:shadow-xl transition-all duration-300 mt-20`}
            onClick={() => {
              toast.dismiss(t.id);
              window.location.href = '/support';
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-white">
                    💬 Nouveau message support
                  </p>
                  <p className="mt-1 text-sm text-white/90">
                    {newMessages === 1 
                      ? 'Vous avez reçu une réponse de notre équipe'
                      : `${newMessages} nouveaux messages de notre équipe`
                    }
                  </p>
                  <p className="mt-1 text-xs text-white/70 font-medium">
                    Cliquez pour voir →
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-white/20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ), {
          duration: 8000,
          position: 'top-center',
        });
      }
    }

    setLastNotificationCount(unreadSupportMessages);
  }, [unreadSupportMessages, lastNotificationCount, location.pathname]);

  return null;
};