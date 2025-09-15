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
          unread_count: ticket.support_messages?.filter(msg => 
            msg.is_admin_reply && 
            new Date(msg.created_at) > new Date(ticket.updated_at || ticket.created_at)
          ).length || 0
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
      // Marquer le ticket comme lu en mettant à jour updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId)
        .eq('user_id', user?.id);
    } catch (error) {
      console.error('Erreur markTicketAsRead:', error);
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
        setAllTickets(data || []);
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

      await fetchAllTickets(); // Rafraîchir la liste
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

      await fetchAllTickets(); // Rafraîchir la liste
      return true;
    } catch (error) {
      console.error('Erreur générale sendAdminReply:', error);
      return false;
    }
  };

  return {
    allTickets,
    totalCount,
    loading,
    isSuperAdmin,
    updateTicketStatus,
    sendAdminReply,
    refetch: fetchAllTickets,
  };
};