import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
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
  Info
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const product = stripeConfig.products[0];
  
  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Si pas d'utilisateur connecté, afficher seulement quelques éléments
  const visibleItems = user ? [
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
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className={`flex justify-around items-center gap-1 ${user ? 'py-3 px-2' : 'py-3 px-2'}`}>
        {visibleItems.map((item, index) => {
          const active = !item.isButton && isActive(item.path);
          
          if (!item.show) return null;
          
          return item.isButton ? (
            <button
              key={`button-${index}`}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 ${getColorClasses(item.color, false)}`}
            >
              <div className="p-1.5 bg-white/50 rounded-lg shadow-sm mb-1">
                <span className="text-lg">{item.emoji}</span>
              </div>
              <span className="text-xs font-semibold text-center leading-tight">{item.label}</span>
            </button>
          ) : (
            <Link
              key={`link-${item.path}`}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all active:scale-95 hover:shadow-md hover:scale-105 min-w-0 ${
                active ? `${getColorClasses(item.color, true)} shadow-lg` : getColorClasses(item.color, false)
              } ${active ? 'border-2 border-dashed' : ''}`}
            >
              <div className="p-1.5 bg-white/50 rounded-lg shadow-sm mb-1">
                <span className="text-lg">{item.emoji}</span>
              </div>
              <span className="text-xs font-semibold text-center leading-tight truncate max-w-16">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};