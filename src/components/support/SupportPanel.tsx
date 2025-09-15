import React, { useState } from 'react';
import { useSupport } from '../../hooks/useSupport';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDateTimeFR } from '../../utils/dateFormatter';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  X,
  User,
  Shield,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SupportPanel: React.FC = () => {
  const { tickets, loading, createTicket, sendMessage, getTicketMessages, markTicketAsRead } = useSupport();
  const { refreshNotifications } = useNotifications();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Formulaire nouveau ticket
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [creatingTicket, setCreatingTicket] = useState(false);

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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setCreatingTicket(true);
    
    try {
      const ticket = await createTicket({
        subject: newTicketSubject,
        message: newTicketMessage,
        priority: newTicketPriority
      });

      if (ticket) {
        toast.success('Ticket créé avec succès !');
        refreshNotifications(); // Actualiser les notifications
        setShowNewTicketForm(false);
        setNewTicketSubject('');
        setNewTicketMessage('');
        setNewTicketPriority('medium');
      } else {
        toast.error('Erreur lors de la création du ticket');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSelectTicket = async (ticketId: string) => {
    setSelectedTicket(ticketId);
    setLoadingMessages(true);
    
    try {
      console.log('🔔 === SÉLECTION TICKET ===');
      console.log('🔔 Ticket sélectionné:', ticketId);
      
      const messages = await getTicketMessages(ticketId);
      setTicketMessages(messages);
      console.log('🔔 Messages chargés:', messages.length);
      
      // Scroller vers le bas après chargement des messages
      setTimeout(scrollToBottom, 200);
      
      console.log('🔔 Marquage du ticket comme lu...');
      await markTicketAsRead(ticketId);
      console.log('🔔 Ticket marqué comme lu, actualisation notifications...');
      
      // Actualiser les notifications avec un délai plus long
      setTimeout(() => {
        console.log('🔔 Actualisation des notifications...');
        refreshNotifications();
        console.log('🔔 Notifications actualisées');
      }, 1500); // Délai augmenté à 1.5 secondes
      
      console.log('🔔 === FIN SÉLECTION TICKET ===');
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      setTicketMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    
    try {
      const success = await sendMessage({
        ticket_id: selectedTicket,
        message: newMessage
      });

      if (success) {
        setNewMessage('');
        refreshNotifications(); // Actualiser les notifications
        // Recharger les messages
        const messages = await getTicketMessages(selectedTicket);
        setTicketMessages(messages);
        // Scroller vers le bas après envoi
        setTimeout(scrollToBottom, 100);
        toast.success('Message envoyé !');
      } else {
        toast.error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSendingMessage(false);
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

  const selectedTicketData = selectedTicket ? tickets.find(t => t.id === selectedTicket) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement du support...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-300">
                  Support Client
                </h2>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Contactez notre équipe pour toute question ou problème
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowNewTicketForm(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau ticket</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vue principale */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Liste des tickets */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mes tickets ({tickets.length})
              </h3>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Aucun ticket de support
                  </p>
                  <Button
                    onClick={() => setShowNewTicketForm(true)}
                    size="sm"
                    className="mt-4"
                  >
                    Créer un ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
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
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(ticket.status)}
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {ticket.subject}
                          </span>
                        </div>
                        {ticket.unread_count && ticket.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {ticket.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTimeFR(ticket.created_at)}
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
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(selectedTicketData.status)}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {getStatusLabel(selectedTicketData.status)}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(selectedTicketData.priority)}`}>
                        Priorité {selectedTicketData.priority}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTicket(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
                    ticketMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_admin_reply ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            message.is_admin_reply
                              ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-white break-words'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white break-words'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {message.is_admin_reply ? (
                              <Shield className="h-3 w-3 text-red-500" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                            <span className="text-xs font-medium">
                             {message.is_admin_reply ? 'Support SignFast' : 'Moi'}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.message}</p>
                          <p className="text-xs opacity-75 mt-2">
                            {formatDateTimeFR(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Formulaire d'envoi de message */}
                {selectedTicketData.status !== 'closed' && (
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="flex-1"
                      disabled={sendingMessage}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sendingMessage}
                      className="flex items-center space-x-1"
                    >
                      {sendingMessage ? (
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

      {/* Modal nouveau ticket */}
      {showNewTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Nouveau ticket
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Décrivez votre problème ou question
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewTicketForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <Input
                  label="Sujet"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Résumez votre problème en quelques mots"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priorité
                  </label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="low">Faible</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Élevée</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description détaillée
                  </label>
                  <textarea
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    placeholder="Décrivez votre problème en détail..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    rows={4}
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowNewTicketForm(false)}
                    className="flex-1"
                    disabled={creatingTicket}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={creatingTicket || !newTicketSubject.trim() || !newTicketMessage.trim()}
                  >
                    {creatingTicket ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Création...</span>
                      </div>
                    ) : (
                      'Créer le ticket'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};