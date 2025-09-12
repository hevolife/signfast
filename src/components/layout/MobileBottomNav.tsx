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
  Shield
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
    { path: '/pdf/templates', icon: FileText, label: 'Templates', show: !isSuperAdmin },
    { path: '/pdf/manager', icon: HardDrive, label: 'Stockage', show: true },
    { path: '/settings', icon: Settings, label: 'Paramètres', show: true }
  ] : [
    { path: '/', icon: Home, label: 'Accueil', show: true },
    { path: '/login', icon: User, label: 'Connexion', show: true }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 md:hidden">
      <div className="flex justify-between items-center py-1 px-2">
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          const active = !item.isButton && isActive(item.path);
          
          if (!item.show) return null;
          
          return item.isButton ? (
            <button
              key={`button-${index}`}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors ${
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </button>
          ) : (
            <Link
              key={`link-${item.path}`}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors ${
                active
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};