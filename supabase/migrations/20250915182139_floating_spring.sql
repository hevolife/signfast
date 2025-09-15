/*
  # Create support system

  1. New Tables
    - `support_tickets` - Support tickets
    - `support_messages` - Messages in tickets
  
  2. Enums
    - `ticket_status` - Ticket statuses
    - `ticket_priority` - Ticket priorities
  
  3. Security
    - Enable RLS on both tables
    - Users can manage their own tickets
    - Super admins can manage all tickets
  
  4. Functions
    - Auto-update timestamps
*/

-- Create enums
CREATE TYPE IF NOT EXISTS ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE IF NOT EXISTS ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status ticket_status DEFAULT 'open'::ticket_status,
  priority ticket_priority DEFAULT 'medium'::ticket_priority,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_admin_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update all tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages on their tickets"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages on their tickets"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    ticket_id IN (
      SELECT id FROM support_tickets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all messages"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can send messages on any ticket"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- Create function to update support tickets timestamp
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for support_tickets updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();