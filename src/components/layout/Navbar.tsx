import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { stripeConfig } from '../../stripe-config';
import { Button } from '../ui/Button';
import { FormInput, LogOut, LayoutDashboard, Moon, Sun, FileText, HardDrive, Crown, Settings, Shield } from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isImpersonating, stopImpersonation } = useAuth();
  const { isSubscribed, subscriptionStatus } = useSubscription();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const product = stripeConfig.products[0];
  
  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const getColorClasses = (color: string, active: boolean) => {
    const colorMap = {
      blue: active 
        ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 border-blue-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:text-blue-600',
      green: active 
        ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 border-green-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-100 hover:text-green-600',
      purple: active 
        ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 border-purple-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:text-purple-600',
      orange: active 
        ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 border-orange-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 hover:text-orange-600',
      indigo: active 
        ? 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-indigo-100 hover:text-indigo-600',
      red: active 
        ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-700 border-red-300'
        : 'text-red-600 dark:text-red-400 hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 hover:text-red-700',
    };
    return colorMap[color] || colorMap.blue;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // La redirection est gérée dans signOut()
    } catch (error) {
      console.error('Erreur déconnexion navbar:', error);
      // Fallback: redirection manuelle
      navigate('/');
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <FormInput className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              SignFast
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user ? (
              <>
                {/* Bannière d'impersonation */}
                {isImpersonating && (
                  <button
                    size="sm"
                    onClick={stopImpersonation}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 bg-gradient-to-br from-red-100 to-red-200 text-red-700 border border-red-300 shadow-sm"
                  >
                    <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                      <span className="text-sm">🚫</span>
                    </div>
                    Arrêter l'impersonation
                  </button>
                )}
                <Link 
                  to="/dashboard"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                    isActive('/dashboard') ? `${getColorClasses('blue', true)} shadow-lg border-2 border-dashed` : getColorClasses('blue', false)
                  }`}
                >
                  <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                    <span className="text-sm">📊</span>
                  </div>
                  <span className="font-semibold">Dashboard</span>
                </Link>
                <Link 
                  to="/forms"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                    isActive('/forms') ? `${getColorClasses('green', true)} shadow-lg border-2 border-dashed` : getColorClasses('green', false)
                  }`}
                >
                  <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                    <span className="text-sm">📝</span>
                  </div>
                  <span className="font-semibold">Formulaires</span>
                </Link>
                <Link 
                  to="/pdf/templates"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                    isActive('/pdf/templates') ? `${getColorClasses('purple', true)} shadow-lg border-2 border-dashed` : getColorClasses('purple', false)
                  }`}
                >
                  <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                    <span className="text-sm">📄</span>
                  </div>
                  <span className="font-semibold">Templates</span>
                </Link>
                <Link 
                  to="/pdf/manager"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                    isActive('/pdf/manager') ? `${getColorClasses('orange', true)} shadow-lg border-2 border-dashed` : getColorClasses('orange', false)
                  }`}
                >
                  <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                    <span className="text-sm">💾</span>
                  </div>
                  <span className="font-semibold">Stockage</span>
                </Link>
                {isSuperAdmin && (
                  <Link 
                    to="/admin"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                      isActive('/admin') ? `${getColorClasses('red', true)} shadow-lg border-2 border-dashed` : getColorClasses('red', false)
                    }`}
                  >
                    <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                      <span className="text-sm">🛡️</span>
                    </div>
                    <span className="font-semibold">Admin</span>
                  </Link>
                )}
                <Link 
                  to="/settings"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                    isActive('/settings') ? `${getColorClasses('indigo', true)} shadow-lg border-2 border-dashed` : getColorClasses('indigo', false)
                  }`}
                >
                  <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                    <span className="text-sm">⚙️</span>
                  </div>
                  <span className="font-semibold">Paramètres</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 text-red-600 dark:text-red-400 hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 hover:text-red-700"
                >
                  <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                    <span className="text-sm">🚪</span>
                  </div>
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Link 
                    to="/login"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                      isActive('/login') ? `${getColorClasses('green', true)} shadow-lg border-2 border-dashed` : getColorClasses('green', false)
                    }`}
                  >
                    <div className="p-1 bg-white/50 rounded-lg shadow-sm">
                      <span className="text-sm">🔑</span>
                    </div>
                    <span className="font-semibold">
                      Connexion
                    </span>
                  </Link>
                  <Link 
                    to="/signup"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${
                      isActive('/signup') ? `${getColorClasses('purple', true)} shadow-lg border-2 border-dashed` : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg'
                    }`}
                  >
                    <div className="p-1 bg-white/20 rounded-lg shadow-sm">
                      <span className="text-sm">✨</span>
                    </div>
                    <span className="font-semibold">
                      S'inscrire
                    </span>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Fonction helper pour vérifier si un lien est actif */}
          {(() => {
            const isActive = (path: string) => {
              return location.pathname === path || location.pathname.startsWith(path);
            };
            return null; // Cette fonction ne rend rien, elle définit juste isActive
          })()}

          {/* Mobile: Only dark mode toggle and logo */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Déconnexion"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};