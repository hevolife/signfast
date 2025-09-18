import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { MessageCircle } from 'lucide-react';

interface SupportNotificationBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export const SupportNotificationBadge: React.FC<SupportNotificationBadgeProps> = ({ 
  className = '', 
  showIcon = true 
}) => {
  const { unreadSupportMessages } = useNotifications();

  if (unreadSupportMessages === 0) {
    return showIcon ? <MessageCircle className={`h-4 w-4 ${className}`} /> : null;
  }

  return (
    <div className="relative">
      {showIcon && <MessageCircle className={`h-4 w-4 ${className}`} />}
      <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg animate-pulse">
        {unreadSupportMessages > 9 ? '9+' : unreadSupportMessages}
      </div>
    </div>
  );
};