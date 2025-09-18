import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useDemo } from '../../contexts/DemoContext';
import { pwaManager } from '../../main';
import { stripeConfig } from '../../stripe-config';
import { Button } from '../ui/Button';
import { FormInput, LogOut, LayoutDashboard, FileText, HardDrive, Crown, Settings, Shield, Menu, X, Sparkles, MessageCircle } from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useNotifications } from '../../contexts/NotificationContext';
import { SupportNotificationBadge } from '../notifications/SupportNotificationBadge';
import toast from 'react-hot-toast';

export const Navbar: React.FC = () => {
  const { user, signOut, isImpersonating, impersonationData, stopImpersonation } = useAuth();
  const { isSubscribed, subscriptionStatus } = useSubscription();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isDemoMode, endDemo } = useDemo();
  const { unreadSupportMessages } = useNotifications();
  const product = stripeConfig.products[0];
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  // Vérifier si l'utilisateur est super admin (seulement si pas en mode démo)
  const isSuperAdmin = !isDemoMode && user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');
  
  const handleSignOut = async () => {
    try {
      // Si on est en mode démo, juste terminer la démo
      if (isDemoMode) {
        endDemo();
        // Gestion PWA pour la démo
        if (pwaManager.isPWAMode()) {
          navigate('/login?pwa=true');
        } else {
          navigate('/');
        }
        return;
      }
      
      // Afficher un toast de confirmation
      toast.loading('Déconnexion en cours...', { duration: 2000 });
      
      await signOut();
      
      // Attendre un peu puis forcer la redirection si nécessaire
      setTimeout(() => {
        const targetPath = pwaManager.isPWAMode() ? '/login?pwa=true' : '/';
        if (window.location.pathname !== targetPath) {
          window.location.href = targetPath;
        }
      }, 1000);
      
    } catch (error) {
      console.error('Erreur déconnexion navbar:', error);
      // Fallback: nettoyage manuel et redirection forcée
      localStorage.clear();
      sessionStorage.clear();
      toast.error('Déconnexion forcée');
      
      // Gestion PWA même en cas d'erreur
      const targetPath = pwaManager.isPWAMode() ? '/login?pwa=true' : '/';
      window.location.href = targetPath;
    }
  };

  const navItems = user || isDemoMode ? [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'blue', emoji: '📊' },
    { path: '/forms', icon: FileText, label: 'Formulaires', color: 'green', emoji: '📝' },
    { path: '/pdf/templates', icon: FileText, label: 'Templates', color: 'purple', emoji: '📄' },
    { path: '/pdf/manager', icon: HardDrive, label: 'Stockage', color: 'orange', emoji: '💾' },
    { path: '/support', icon: MessageCircle, label: 'Support', color: 'indigo', emoji: '🚀' },
    { path: '/settings', icon: Settings, label: 'Paramètres', color: 'indigo', emoji: '⚙️' },
  ] : [];

  const getNavItemColorClasses = (color: string, isActive: boolean) => {
    const colorMap = {
      blue: isActive 
        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-400 hover:to-blue-500 hover:text-white hover:shadow-md',
      green: isActive 
        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-green-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-400 hover:to-emerald-500 hover:text-white hover:shadow-md',
      purple: isActive 
        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-purple-400 hover:to-purple-500 hover:text-white hover:shadow-md',
      orange: isActive 
        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-orange-400 hover:to-orange-500 hover:text-white hover:shadow-md',
      indigo: isActive 
        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-400 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-indigo-400 hover:to-indigo-500 hover:text-white hover:shadow-md',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-b border-gray-200/50 dark:border-gray-700/50 md:block sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo moderne */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FormInput className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SignFast
            </span>
          </Link>

          {/* Navigation Desktop */}
          <div className="hidden lg:flex items-center space-x-2">
            {!!user || isDemoMode ? (
              <>
                {/* Navigation moderne par onglets */}
                <div className="flex items-center space-x-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-2 shadow-lg mr-4">
                  {navItems.map((item) => {
                    const isActive = window.location.pathname === item.path || window.location.pathname.startsWith(item.path + '/');
                    return (
                      <Link key={item.path} to={item.path}>
                        <button className={`py-2 px-3 rounded-xl font-semibold text-sm transition-all active:scale-95 hover:scale-105 ${getNavItemColorClasses(item.color, isActive)}`}>
                          <div className="flex items-center space-x-2">
                            <div className="p-1 rounded-lg">
                              {item.path === '/support' ? (
                                <div className="relative">
                                  <span className="text-lg">🚀</span>
                                  {unreadSupportMessages > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                                      {unreadSupportMessages > 9 ? '9+' : unreadSupportMessages}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-lg">{item.emoji}</span>
                                 <span className="text-lg">📩</span>
                            </div>
                            <span className="hidden xl:inline">{item.label}</span>
                          </div>
                        </button>
                      </Link>
                    );
                  })}
                </div>

                {/* Badges et statuts */}
                {isDemoMode && (
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 px-4 py-2 rounded-full shadow-lg">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center space-x-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Mode Démo</span>
                    </span>
                  </div>
                )}
                
                {/* Bannière d'impersonation */}
                {!isDemoMode && isImpersonating && impersonationData && (
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 px-4 py-2 rounded-full shadow-lg">
                    <span className="text-xs font-bold text-red-800 dark:text-red-300">
                      Impersonation: {impersonationData.target_email}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={stopImpersonation}
                      className="text-red-600 hover:text-red-700 hover:bg-red-200 dark:hover:bg-red-800 px-2 py-1 text-xs rounded-lg"
                    >
                      Arrêter
                    </Button>
                  </div>
                )}

                {/* Bouton Admin pour super admins */}
                {!isDemoMode && user && isSuperAdmin && (
                  <Link to="/admin" className="ml-2">
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <Shield className="h-4 w-4" />
                      <span className="hidden xl:inline">Admin</span>
                    </Button>
                  </Link>
                )}

                {/* Bouton déconnexion */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ml-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden xl:inline">{isDemoMode ? 'Quitter démo' : 'Déconnexion'}</span>
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 hover:from-blue-200 hover:to-indigo-200 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      Connexion
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl">
                      S'inscrire
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile: Menu burger */}
          <div className="lg:hidden flex items-center space-x-2">
            {(!!user || isDemoMode) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 hover:from-blue-200 hover:to-indigo-200 rounded-xl shadow-lg"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            {!user && !isDemoMode && (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 hover:from-blue-200 hover:to-indigo-200 font-semibold rounded-xl shadow-lg">
                    Connexion
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-xl rounded-xl">
                    S'inscrire
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Menu mobile moderne */}
        {mobileMenuOpen && (user || isDemoMode) && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border-b border-gray-200/50 dark:border-gray-700/50 z-50">
            <div className="px-4 py-6 space-y-4">
              {/* Badges de statut mobile */}
              <div className="flex flex-wrap gap-2 mb-4">
                {isDemoMode && (
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 px-3 py-2 rounded-full shadow-lg">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center space-x-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Mode Démo</span>
                    </span>
                  </div>
                )}
                
                {isSubscribed && !isDemoMode && (
                  <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 px-3 py-2 rounded-full shadow-lg">
                    <span className="text-xs font-bold text-yellow-800 dark:text-yellow-300 flex items-center space-x-1">
                      <Crown className="h-3 w-3" />
                      <span>{product.name}</span>
                    </span>
                  </div>
                )}

                {/* Bannière d'impersonation mobile */}
                {!isDemoMode && isImpersonating && impersonationData && (
                  <div className="w-full bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 px-4 py-3 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-800 dark:text-red-300">
                        Impersonation: {impersonationData.target_email}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={stopImpersonation}
                        className="text-red-600 hover:text-red-700 hover:bg-red-200 dark:hover:bg-red-800 px-2 py-1 text-xs rounded-lg"
                      >
                        Arrêter
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation mobile */}
              <div className="grid grid-cols-2 gap-3">
                {navItems.map((item) => {
                  const isActive = window.location.pathname === item.path || window.location.pathname.startsWith(item.path + '/');
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                      <div className={`p-4 rounded-xl transition-all active:scale-95 hover:scale-105 ${getNavItemColorClasses(item.color, isActive)}`}>
                        <div className="flex flex-col items-center space-y-2">
                          <div className="p-2 rounded-xl">
                           {item.path === '/support' ? (
                             <div className="relative">
                               <span className="text-lg">📩</span>
                               {unreadSupportMessages > 0 && (
                                 <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                                   {unreadSupportMessages > 9 ? '9+' : unreadSupportMessages}
                                 </div>
                               )}
                             </div>
                           ) : (
                             <span className="text-lg">{item.emoji}</span>
                           )}
                          </div>
                          <div className="text-center">
                            <span className="font-bold text-sm">{item.label}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Actions spéciales mobile */}
              <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
                {!isDemoMode && user && isSuperAdmin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200 dark:border-red-800 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl">
                          <Shield className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <span className="font-bold text-red-800 dark:text-red-300">Dashboard Admin</span>
                          <p className="text-xs text-red-600 dark:text-red-400">Gestion système</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Mode sombre mobile */}

                {/* Déconnexion mobile */}
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <LogOut className="h-5 w-5" />
                    <span>{isDemoMode ? 'Quitter la démo' : 'Se déconnecter'}</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};