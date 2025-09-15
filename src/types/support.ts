export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    user_profiles?: {
      first_name?: string;
      last_name?: string;
      company_name?: string;
    };
  };
  messages?: SupportMessage[];
  unread_count?: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user?: {
    email: string;
    user_profiles?: {
      first_name?: string;
      last_name?: string;
      company_name?: string;
    };
  };
}

export interface CreateTicketData {
  subject: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SendMessageData {
  ticket_id: string;
  message: string;
}