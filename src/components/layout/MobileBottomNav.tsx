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
  Info
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isDemoMode } = useDemo();
  const product = stripeConfig.products[0];
  
  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Si pas d'utilisateur connecté, afficher seulement quelques éléments
  const visibleItems = (user || isDemoMode) ? [
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
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20',
      green: active 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20',
      purple: active 
        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20',
      orange: active 
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20',
      indigo: active 
        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden shadow-lg pb-4 ${isDemoMode ? 'border-t-2 border-t-blue-500' : ''}`} style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
      {isDemoMode && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-1">
          <span className="text-xs font-medium">Mode Démo Actif</span>
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
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all active:scale-95 ${getColorClasses(item.color, false)}`}
            >
              <div className="p-1 bg-white/30 rounded-md mb-0.5">
                <span className="text-sm">{item.emoji}</span>
              </div>
              <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
            </button>
          ) : (
            <Link
              key={`link-${item.path}`}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all active:scale-95 min-w-0 ${
                active ? `${getColorClasses(item.color, true)}` : getColorClasses(item.color, false)
              }`}
            >
              <div className="p-1 bg-white/30 rounded-md mb-0.5">
                <span className="text-sm">{item.emoji}</span>
              </div>
              <span className="text-[10px] font-medium text-center leading-tight truncate max-w-16">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};