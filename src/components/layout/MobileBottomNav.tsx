import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { SupportNotificationBadge } from '../notifications/SupportNotificationBadge';
import { 
  LayoutDashboard, 
  FileText, 
  HardDrive, 
  Settings,
  MessageCircle
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const location = useLocation();

  // Ne pas afficher sur les formulaires publics
  if (location.pathname.startsWith('/form/')) {
    return null;
  }

  // Ne pas afficher si pas connecté et pas en mode démo
  if (!user && !isDemoMode) {
    return null;
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', emoji: '📊' },
    { path: '/forms', icon: FileText, label: 'Formulaires', emoji: '📝' },
    { path: '/pdf/manager', icon: HardDrive, label: 'Stockage', emoji: '💾' },
    { path: '/support', icon: MessageCircle, label: 'Support', emoji: '🚀' },
    { path: '/settings', icon: Settings, label: 'Paramètres', emoji: '⚙️' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 z-40 md:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link key={item.path} to={item.path}>
              <div className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                isActive 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}>
                <div className="relative mb-1">
                 {item.path === '/support' ? (
                   <span className="text-lg">📩</span>
                 ) : (
                   <span className="text-lg">{item.emoji}</span>
                 )}
                </div>
                <span className="text-xs font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};