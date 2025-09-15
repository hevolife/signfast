/*
  # Create support system

  1. New Tables
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `subject` (text)
      - `status` (enum: open, in_progress, resolved, closed)
      - `priority` (enum: low, medium, high, urgent)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `support_messages`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, foreign key to support_tickets)
      - `user_id` (uuid, foreign key to auth.users)
      - `message` (text)
      - `is_admin_reply` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can only see their own tickets and messages
    - Super admins can see all tickets and messages
    - Users can create tickets and send messages on their tickets
    - Only super admins can change ticket status

  3. Enums
    - ticket_status: open, in_progress, resolved, closed
    - ticket_priority: low, medium, high, urgent
*/

-- Create enums for ticket status and priority
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status ticket_status DEFAULT 'open' NOT NULL,
  priority ticket_priority DEFAULT 'medium' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin_reply boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Users can create their own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can update all tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Policies for support_messages
CREATE POLICY "Users can view messages on their tickets"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all messages"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

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

CREATE POLICY "Super admins can send messages on any ticket"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- Create trigger to update updated_at on support_tickets
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();