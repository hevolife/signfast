import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SupportTicket, SupportMessage, CreateTicketData, SendMessageData } from '../types/support';

export const useSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Vérifier si Supabase est configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
        console.warn('Supabase non configuré, support non disponible');
        setTickets([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages(
            id,
            message,
            is_admin_reply,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération tickets:', error);
        setTickets([]);
        setTotalCount(0);
      } else {
        // Calculer le nombre de messages non lus pour chaque ticket
        const ticketsWithUnreadCount = (data || []).map(ticket => ({
          ...ticket,
          unread_count: (() => {
            // Récupérer le temps de lecture local pour ce ticket
            const readTickets = JSON.parse(localStorage.getItem('read_support_tickets') || '{}');
            const localReadTime = readTickets[ticket.id];
            
            // Utiliser le temps le plus récent entre la DB et le local
            const effectiveReadTime = localReadTime && new Date(localReadTime) > new Date(ticket.updated_at || ticket.created_at)
              ? localReadTime 
              : ticket.updated_at || ticket.created_at;
            
            const unreadCount = ticket.support_messages?.filter(msg => 
              msg.is_admin_reply && 
              new Date(msg.created_at) > new Date(effectiveReadTime)
            ).length || 0;
            
            console.log(`🔔 Ticket ${ticket.id} unread count:`, {
              dbTime: ticket.updated_at,
              localTime: localReadTime,
              effectiveTime: effectiveReadTime,
              unreadCount
            });
            
            return unreadCount;
          })()
        }));
        
        setTickets(ticketsWithUnreadCount);
        setTotalCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Erreur générale fetchTickets:', error);
      setTickets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: CreateTicketData): Promise<SupportTicket | null> => {
    if (!user) return null;

    try {
      // Créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert([{
          user_id: user.id,
          subject: ticketData.subject,
          priority: ticketData.priority || 'medium',
          status: 'open'
        }])
        .select()
        .single();

      if (ticketError) {
        console.error('Erreur création ticket:', ticketError);
        return null;
      }

      // Ajouter le premier message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticket.id,
          user_id: user.id,
          message: ticketData.message,
          is_admin_reply: false
        }]);

      if (messageError) {
        console.error('Erreur création message initial:', messageError);
        // Le ticket est créé mais sans message initial
      }

      await fetchTickets(); // Rafraîchir la liste
      return ticket;
    } catch (error) {
      console.error('Erreur générale createTicket:', error);
      return null;
    }
  };

  const sendMessage = async (messageData: SendMessageData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: messageData.ticket_id,
          user_id: user.id,
          message: messageData.message,
          is_admin_reply: false
        }]);

      if (error) {
        console.error('Erreur envoi message:', error);
        return false;
      }

      await fetchTickets(); // Rafraîchir la liste
      return true;
    } catch (error) {
      console.error('Erreur générale sendMessage:', error);
      return false;
    }
  };

  const getTicketMessages = async (ticketId: string): Promise<SupportMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur récupération messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erreur générale getTicketMessages:', error);
      return [];
    }
  };

  const markTicketAsRead = async (ticketId: string): Promise<void> => {
    try {
      if (!user) {
        return;
      }

      // Sauvegarder localement que ce ticket a été lu avec un timestamp futur
      // pour s'assurer que tous les messages admin existants sont considérés comme lus
      const readTickets = JSON.parse(localStorage.getItem('read_support_tickets') || '{}');
      readTickets[ticketId] = new Date(Date.now() + 2000).toISOString(); // +2 secondes dans le futur
      localStorage.setItem('read_support_tickets', JSON.stringify(readTickets));
      
      console.log('📖 Ticket marqué comme lu localement:', ticketId, readTickets[ticketId]);
      
      // Optionnel: Mettre à jour en base de données aussi
      try {
        await supabase
          .from('support_tickets')
          .update({ updated_at: new Date(Date.now() + 1000).toISOString() })
          .eq('id', ticketId)
          .eq('user_id', user?.id);
      } catch (dbError) {
        // Ignorer les erreurs DB, le localStorage suffit
        console.log('⚠️ Erreur mise à jour DB (ignorée):', dbError);
      }
    } catch (error) {
      console.error('❌ Erreur markTicketAsRead:', error);
    }
  };

  return {
    tickets,
    totalCount,
    loading,
    createTicket,
    sendMessage,
    getTicketMessages,
    markTicketAsRead,
    refetch: fetchTickets,
  };
};

// Hook pour les super admins
export const useSupportAdmin = () => {
  const { user } = useAuth();
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.email === 'admin@signfast.com' || user?.email?.endsWith('@admin.signfast.com');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllTickets();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchAllTickets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages(
            id,
            message,
            is_admin_reply,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération tickets admin:', error);
        setAllTickets([]);
        setTotalCount(0);
      } else {
        // Calculer le nombre de messages non lus pour chaque ticket (côté admin)
        const ticketsWithUnreadCount = (data || []).map(ticket => ({
          ...ticket,
          unread_count: (() => {
            // Pour les admins, compter les messages utilisateur non lus
            // Récupérer le temps de lecture local pour ce ticket (côté admin)
            const readTickets = JSON.parse(localStorage.getItem('admin_read_support_tickets') || '{}');
            const localReadTime = readTickets[ticket.id];
            
            // Utiliser le temps le plus récent entre la DB et le local
            const effectiveReadTime = localReadTime && new Date(localReadTime) > new Date(ticket.updated_at || ticket.created_at)
              ? localReadTime 
              : ticket.updated_at || ticket.created_at;
            
            // Compter les messages utilisateur (non admin) postérieurs au temps de lecture
            const unreadCount = ticket.support_messages?.filter(msg => 
              !msg.is_admin_reply && 
              new Date(msg.created_at) > new Date(effectiveReadTime)
            ).length || 0;
            
            console.log(`🔔 Admin - Ticket ${ticket.id} unread count:`, {
              dbTime: ticket.updated_at,
              localTime: localReadTime,
              effectiveTime: effectiveReadTime,
              unreadCount
            });
            
            return unreadCount;
          })()
        }));
        
        setAllTickets(ticketsWithUnreadCount);
        setTotalCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Erreur générale fetchAllTickets:', error);
      setAllTickets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAdminTicketAsRead = async (ticketId: string): Promise<void> => {
    try {
      if (!user) {
        return;
      }

      // Marquer le ticket comme lu en mettant à jour updated_at avec un timestamp futur
      // pour s'assurer que tous les messages utilisateur existants sont considérés comme lus
      const { error } = await supabase
        .from('support_tickets')
        .update({ updated_at: new Date(Date.now() + 1000).toISOString() }) // +1 seconde dans le futur
        .eq('id', ticketId);
      
      if (error) {
      } else {
        // Sauvegarder localement que ce ticket a été lu (côté admin)
        const readTickets = JSON.parse(localStorage.getItem('admin_read_support_tickets') || '{}');
        readTickets[ticketId] = new Date().toISOString();
        localStorage.setItem('admin_read_support_tickets', JSON.stringify(readTickets));
      }
    } catch (error) {
    }
  };
  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']): Promise<boolean> => {
    if (!isSuperAdmin) return false;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) {
        console.error('Erreur mise à jour statut:', error);
        return false;
      }

      // Mettre à jour seulement le ticket local pour éviter le refetch complet
      setAllTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status }
          : ticket
      ));
      return true;
    } catch (error) {
      console.error('Erreur générale updateTicketStatus:', error);
      return false;
    }
  };

  const sendAdminReply = async (ticketId: string, message: string): Promise<boolean> => {
    if (!isSuperAdmin || !user) return false;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          user_id: user.id,
          message: message,
          is_admin_reply: true
        }]);

      if (error) {
        console.error('Erreur envoi réponse admin:', error);
        return false;
      }

      // Mettre à jour le statut du ticket si c'était ouvert
      await supabase
        .from('support_tickets')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .eq('status', 'open');

      return true;
    } catch (error) {
      console.error('Erreur générale sendAdminReply:', error);
      return false;
    }
  };

  return {
    allTickets,
    setAllTickets,
    allTickets,
    totalCount,
    loading,
    isSuperAdmin,
    markAdminTicketAsRead,
    updateTicketStatus,
    sendAdminReply,
    refetch: fetchAllTickets,
  };
};