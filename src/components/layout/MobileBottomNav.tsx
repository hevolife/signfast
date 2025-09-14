import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useDemo } from '../../contexts/DemoContext';
import { stripeConfig } from '../../stripe-config';
import { useDarkMode } from '../../hooks/useDarkMode';
import { 
  Home, 
  LayoutDashboard, 
  FileText, 
  HardDrive, 
  User,
  Settings,
  Shield,
  LogIn,
  UserPlus,
  Info,
  Sparkles,
  Crown
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isDemoMode } = useDemo();
  const product = stripeConfig.products[0];
  
  // Vérifier si l'utilisateur est super admin (seulement si pas en mode démo)
  const isSuperAdmin = !isDemoMode && user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // En mode démo ou avec utilisateur connecté, afficher tous les éléments
  const visibleItems = user || isDemoMode ? [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', show: true, color: 'blue', emoji: '📊' },
    { path: '/forms', icon: FileText, label: 'Formulaires', show: true, color: 'green', emoji: '📝' },
    { path: '/pdf/templates', icon: FileText, label: 'Templates', show: true, color: 'purple', emoji: '📄' },
    { path: '/pdf/manager', icon: HardDrive, label: 'Stockage', show: true, color: 'orange', emoji: '💾' },
    { path: '/settings', icon: Settings, label: 'Paramètres', show: true, color: 'indigo', emoji: '⚙️' }
  ] : [
    { path: '/', icon: Home, label: 'Accueil', show: true, color: 'blue', emoji: '🏠' },
    { path: '/login', icon: LogIn, label: 'Connexion', show: true, color: 'green', emoji: '🔑' },
    { path: '/signup', icon: UserPlus, label: 'Inscription', show: true, color: 'purple', emoji: '✨' }
  ];

  const getColorClasses = (color: string, active: boolean) => {
    const colorMap = {
      blue: active 
        ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:text-blue-600 hover:shadow-md',
      green: active 
        ? 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-100 hover:text-green-600 hover:shadow-md',
      purple: active 
        ? 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:text-purple-600 hover:shadow-md',
      orange: active 
        ? 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 hover:text-orange-600 hover:shadow-md',
      indigo: active 
        ? 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 shadow-lg'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-indigo-100 hover:text-indigo-600 hover:shadow-md',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 z-50 lg:hidden shadow-2xl pb-4 ${isDemoMode ? 'border-t-2 border-t-blue-500' : ''}`} style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
      {isDemoMode && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-2 shadow-lg">
          <span className="text-xs font-bold flex items-center justify-center space-x-1">
            <Sparkles className="h-3 w-3" />
            <span>Mode Démo Actif</span>
          </span>
        </div>
      )}
      
      {isSubscribed && !isDemoMode && (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-2 shadow-lg">
          <span className="text-xs font-bold flex items-center justify-center space-x-1">
            <Crown className="h-3 w-3" />
            <span>{product.name} Actif</span>
          </span>
        </div>
      )}
      
      <div className={`flex justify-around items-center gap-1 ${user ? 'py-2 px-1' : 'py-2 px-1'}`}>
        {visibleItems.map((item, index) => {
          const active = !item.isButton && isActive(item.path);
          
          if (!item.show) return null;
          
          return item.isButton ? (
            <button
              key={`button-${index}`}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all active:scale-95 hover:scale-105 ${getColorClasses(item.color, false)}`}
            >
              <div className="p-1.5 bg-white/50 backdrop-blur-sm rounded-lg mb-1 shadow-md">
                <span className="text-sm">{item.emoji}</span>
              </div>
              <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
            </button>
          ) : (
            <Link
              key={`link-${item.path}`}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all active:scale-95 hover:scale-105 min-w-0 ${
                active ? `${getColorClasses(item.color, true)}` : getColorClasses(item.color, false)
              }`}
            >
              <div className="p-1.5 bg-white/50 backdrop-blur-sm rounded-lg mb-1 shadow-md">
                <span className="text-sm">{item.emoji}</span>
              </div>
              <span className="text-[10px] font-bold text-center leading-tight truncate max-w-16">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};