import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface NotificationContextType {
  unreadSupportMessages: number;
  refreshNotifications: () => void;
  markSupportAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadSupportMessages, setUnreadSupportMessages] = useState(0);

  const checkUnreadMessages = async () => {
    if (!user) {
      setUnreadSupportMessages(0);
      return;
    }

    try {
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        setUnreadSupportMessages(0);
        return;
      }

      // Récupérer les tickets de l'utilisateur avec leurs messages
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          updated_at,
          support_messages(
            id,
            is_admin_reply,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.warn('Erreur récupération notifications support:', error);
        setUnreadSupportMessages(0);
        return;
      }

      // Compter les messages admin non lus
      let totalUnread = 0;
      
      (tickets || []).forEach(ticket => {
        const adminMessages = ticket.support_messages?.filter(msg => 
          msg.is_admin_reply && 
          new Date(msg.created_at) > new Date(ticket.updated_at)
        ) || [];
        
        totalUnread += adminMessages.length;
      });

      setUnreadSupportMessages(totalUnread);
    } catch (error) {
      console.error('Erreur vérification notifications:', error);
      setUnreadSupportMessages(0);
    }
  };

  const markSupportAsRead = () => {
    console.log('🔔 Marquage support comme lu, ancien count:', unreadSupportMessages);
    setUnreadSupportMessages(0);
    console.log('🔔 Support marqué comme lu, nouveau count: 0');
  };

  // Vérifier les notifications au chargement et périodiquement
  useEffect(() => {
    if (user) {
      checkUnreadMessages();
      
      // Vérifier toutes les 30 secondes
      const interval = setInterval(checkUnreadMessages, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadSupportMessages(0);
    }
  }, [user]);

  // Écouter les changements en temps réel sur les messages de support
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('support_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `is_admin_reply=eq.true`
        },
        (payload) => {
          console.log('🔔 Nouveau message admin reçu:', payload);
          // Vérifier si le message concerne l'utilisateur actuel
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value = {
    unreadSupportMessages,
    refreshNotifications: checkUnreadMessages,
    markSupportAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};