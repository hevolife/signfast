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
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { path: '/forms', icon: FileText, label: 'Formulaires', show: true },
    { path: '/pdf/templates', icon: FileText, label: 'Templates', show: true },
    { path: '/pdf/manager', icon: HardDrive, label: 'Stockage', show: true },
    { path: '/settings', icon: Settings, label: 'Paramètres', show: true }
  ] : [
    { path: '/', icon: Home, label: 'Accueil', show: true },
    { path: '/login', icon: LogIn, label: 'Connexion', show: true },
    { path: '/signup', icon: UserPlus, label: 'Inscription', show: true },
    { path: '/#demo', icon: Info, label: 'Démo', show: true }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className={`flex justify-around items-center ${user ? 'py-4 px-1' : 'py-3 px-2'}`}>
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          const active = !item.isButton && isActive(item.path);
          
          if (!item.show) return null;
          
          return item.isButton ? (
            <button
              key={`button-${index}`}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center ${user ? 'py-2 px-2' : 'py-2 px-3'} rounded-lg transition-colors ${
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className={`${user ? 'h-6 w-6' : 'h-5 w-5'} mb-1`} />
              <span className={`${user ? 'text-xs' : 'text-xs'} font-medium`}>{item.label}</span>
            </button>
          ) : (
            <Link
              key={`link-${item.path}`}
              to={item.path}
              className={`flex flex-col items-center justify-center ${user ? 'py-2 px-1' : 'py-2 px-3'} rounded-lg transition-colors min-w-0 ${
                active
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className={`${user ? 'h-7 w-7' : 'h-5 w-5'} mb-1`} />
              <span className={`${user ? 'text-xs' : 'text-xs'} font-medium truncate max-w-16 text-center`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};