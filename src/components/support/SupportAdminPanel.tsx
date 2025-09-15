import React, { useState } from 'react';
import { useSupportAdmin } from '../../hooks/useSupport';
import { supabase } from '../../lib/supabase';
import { formatDateTimeFR } from '../../utils/dateFormatter';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { 
  MessageCircle, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  X,
  User,
  Shield,
  Filter,
  Search,
  Users,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SupportAdminPanel: React.FC = () => {
  const { allTickets, loading, isSuperAdmin, markAdminTicketAsRead, updateTicketStatus, sendAdminReply, refetch, setAllTickets } = useSupportAdmin();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Fonction pour scroller vers le bas
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  };

  // Scroller vers le bas quand les messages changent
  React.useEffect(() => {
    if (ticketMessages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [ticketMessages]);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Accès restreint
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Seuls les super administrateurs peuvent accéder au support.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSelectTicket = async (ticketId: string) => {
    setSelectedTicket(ticketId);
    setLoadingMessages(true);
    
    try {
      console.log('🔔 Admin === SÉLECTION TICKET ===');
      console.log('🔔 Admin Ticket sélectionné:', ticketId);
      
      // Charger les messages du ticket
      const { data: messages, error: messagesError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('🔔 Admin Erreur chargement messages:', messagesError);
        setTicketMessages([]);
      } else {
        setTicketMessages(messages || []);
        console.log('🔔 Admin Messages chargés:', messages?.length || 0);
        // Scroller vers le bas après chargement des messages
        setTimeout(scrollToBottom, 200);
      }
      
      console.log('🔔 Admin Marquage du ticket comme lu...');
      await markAdminTicketAsRead(ticketId);
      console.log('🔔 Admin Ticket marqué comme lu');
      
      // Mettre à jour seulement le ticket local pour éviter le refetch complet
      setAllTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, unread_count: 0 }
          : ticket
      ));
      
      console.log('🔔 Admin === FIN SÉLECTION TICKET ===');
    } catch (error) {
      console.error('🔔 Admin Erreur sélection ticket:', error);
      setTicketMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReply.trim() || !selectedTicket) return;

    setSendingReply(true);
    
    try {
      const success = await sendAdminReply(selectedTicket, newReply);

      if (success) {
        setNewReply('');
        // Recharger les messages après envoi
        const { data: messages } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', selectedTicket)
          .order('created_at', { ascending: true });
        
        setTicketMessages(messages || []);
        // Scroller vers le bas après envoi
        setTimeout(scrollToBottom, 100);
        toast.success('Réponse envoyée !');
      } else {
        toast.error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const success = await updateTicketStatus(ticketId, newStatus as any);
    if (success) {
      toast.success('Statut mis à jour !');
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Ouvert';
      case 'in_progress':
        return 'En cours';
      case 'resolved':
        return 'Résolu';
      case 'closed':
        return 'Fermé';
      default:
        return 'Inconnu';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getUserDisplayName = (ticket: any): string => {
    const user = ticket.user;
    if (!user) return 'Utilisateur inconnu';
    
    if (user.user_profiles?.company_name) {
      return user.user_profiles.company_name;
    }
    
    const firstName = user.user_profiles?.first_name || '';
    const lastName = user.user_profiles?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return fullName;
    }
    
    return user.email || 'Utilisateur';
  };

  const filteredTickets = allTickets.filter(ticket => {
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesSearch = !searchTerm || 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserDisplayName(ticket).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const selectedTicketData = selectedTicket ? allTickets.find(t => t.id === selectedTicket) : null;

  // Statistiques
  const openTickets = allTickets.filter(t => t.status === 'open').length;
  const inProgressTickets = allTickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = allTickets.filter(t => t.status === 'resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement du support...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Tickets ouverts
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {openTickets}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  En cours
                </p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                  {inProgressTickets}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Résolus
                </p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {resolvedTickets}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Total
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                  {allTickets.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Rechercher par sujet ou utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="open">Ouverts</option>
                <option value="in_progress">En cours</option>
                <option value="resolved">Résolus</option>
                <option value="closed">Fermés</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vue principale */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Liste des tickets */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tickets ({filteredTickets.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refetch}
                  className="flex items-center space-x-1"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Actualiser</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm || filterStatus !== 'all' ? 'Aucun ticket trouvé' : 'Aucun ticket de support'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedTicket === ticket.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {getStatusIcon(ticket.status)}
                            <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {ticket.subject}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {getUserDisplayName(ticket)}
                          </p>
                        </div>
                        {ticket.unread_count && ticket.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {ticket.unread_count}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDateTimeFR(ticket.created_at)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {ticket.support_messages?.length || 0} message{(ticket.support_messages?.length || 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversation */}
        <div className="lg:col-span-2">
          {selectedTicketData ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedTicketData.subject}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Par {getUserDisplayName(selectedTicketData)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(selectedTicketData.priority)}`}>
                        {selectedTicketData.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedTicketData.status}
                      onChange={(e) => handleStatusChange(selectedTicketData.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="open">Ouvert</option>
                      <option value="in_progress">En cours</option>
                      <option value="resolved">Résolu</option>
                      <option value="closed">Fermé</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicket(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {/* Messages */}
              <CardContent className="flex-1 flex flex-col">
                <div 
                  ref={messagesEndRef}
                  className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96"
                >
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
                    </div>
                  ) : (
                    ticketMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 dark:text-gray-400">Aucun message dans cette conversation</p>
                      </div>
                    ) : (
                      ticketMessages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_admin_reply ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg break-words ${
                          message.is_admin_reply
                            ? 'bg-gradient-to-br from-red-500 to-pink-600 text-white break-words'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-white break-words'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          {message.is_admin_reply ? (
                            <Shield className="h-3 w-3 text-yellow-300" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium">
                            {message.is_admin_reply ? 'Support Admin' : getUserDisplayName(selectedTicketData)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.message}</p>
                        <p className="text-xs opacity-75 mt-2">
                          {formatDateTimeFR(message.created_at)}
                        </p>
                      </div>
                    </div>
                      ))
                    )
                  )}
                </div>

                {/* Formulaire de réponse admin */}
                {selectedTicketData.status !== 'closed' && (
                  <form onSubmit={handleSendReply} className="flex space-x-2">
                    <Input
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Tapez votre réponse..."
                      className="flex-1"
                      disabled={sendingReply}
                    />
                    <Button
                      type="submit"
                      disabled={!newReply.trim() || sendingReply}
                      className="flex items-center space-x-1 bg-red-600 hover:bg-red-700"
                    >
                      {sendingReply ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sélectionnez un ticket
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choisissez un ticket dans la liste pour voir la conversation
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};