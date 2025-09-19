import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { SupportPanel } from '../components/support/SupportPanel';
import { Card, CardContent } from '../components/ui/Card';
import { MessageCircle, Sparkles } from 'lucide-react';

export const Support: React.FC = () => {
  const { user } = useAuth();
  const { markSupportAsRead } = useNotifications();

  // Marquer les messages comme lus quand on arrive sur la page avec un délai
  React.useEffect(() => {
    // Délai pour s'assurer que les données sont chargées
    const timer = setTimeout(() => {
      markSupportAsRead();
      console.log('📖 Support marqué comme lu depuis la page Support');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [markSupportAsRead]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connexion requise
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Vous devez être connecté pour accéder au support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl shadow-2xl mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl"></div>
          
          <div className="relative px-6 sm:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 shadow-lg">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Support Client
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-2xl mx-auto">
                Notre équipe est là pour vous aider • Réponse sous 24h garantie
              </p>
              
              {/* Informations de contact */}
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Support disponible 7j/7 • Réponse rapide</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de support */}
        <SupportPanel />

        {/* Informations d'aide */}
        <Card className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 mb-4">
                Comment bien utiliser le support ?
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-sm text-indigo-700 dark:text-indigo-400">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white text-lg">📝</span>
                  </div>
                  <h4 className="font-semibold mb-2">Soyez précis</h4>
                  <p>Décrivez votre problème avec le maximum de détails pour une résolution plus rapide.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white text-lg">📸</span>
                  </div>
                  <h4 className="font-semibold mb-2">Ajoutez des captures</h4>
                  <p>N'hésitez pas à inclure des captures d'écran pour illustrer votre problème.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <span className="text-white text-lg">⚡</span>
                  </div>
                  <h4 className="font-semibold mb-2">Réponse rapide</h4>
                  <p>Notre équipe vous répond généralement sous 24h, souvent beaucoup plus rapidement.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};