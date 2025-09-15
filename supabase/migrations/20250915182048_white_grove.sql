/*
  # Create Stripe payment system

  1. New Tables
    - `stripe_customers` - Stripe customer mapping
    - `stripe_subscriptions` - Subscription data
    - `stripe_orders` - One-time payments
  
  2. Enums
    - `stripe_subscription_status` - Subscription statuses
    - `stripe_order_status` - Order statuses
  
  3. Views
    - `stripe_user_subscriptions` - User subscription view
    - `stripe_user_orders` - User orders view
  
  4. Security
    - Enable RLS on all tables
    - User access to their own data only
*/

-- Create enums
CREATE TYPE IF NOT EXISTS stripe_subscription_status AS ENUM (
  'not_started',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

CREATE TYPE IF NOT EXISTS stripe_order_status AS ENUM (
  'pending',
  'completed',
  'canceled'
);

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL,
  customer_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create stripe_subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint PRIMARY KEY,
  customer_id text UNIQUE NOT NULL,
  subscription_id text,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  status stripe_subscription_status NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create stripe_orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
  id bigint PRIMARY KEY,
  checkout_session_id text NOT NULL,
  payment_intent_id text NOT NULL,
  customer_id text NOT NULL,
  amount_subtotal bigint NOT NULL,
  amount_total bigint NOT NULL,
  currency text NOT NULL,
  payment_status text NOT NULL,
  status stripe_order_status DEFAULT 'pending'::stripe_order_status,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers
CREATE POLICY "Users can view their own customer data"
  ON stripe_customers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- RLS Policies for stripe_subscriptions
CREATE POLICY "Users can view their own subscription data"
  ON stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- RLS Policies for stripe_orders
CREATE POLICY "Users can view their own order data"
  ON stripe_orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- Create views for easier access
CREATE OR REPLACE VIEW stripe_user_subscriptions
WITH (security_definer=true)
AS
SELECT 
  sc.customer_id,
  ss.subscription_id,
  ss.status as subscription_status,
  ss.price_id,
  ss.current_period_start,
  ss.current_period_end,
  ss.cancel_at_period_end,
  ss.payment_method_brand,
  ss.payment_method_last4
FROM stripe_customers sc
LEFT JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE sc.user_id = auth.uid() AND sc.deleted_at IS NULL;

CREATE OR REPLACE VIEW stripe_user_orders
WITH (security_definer=true)
AS
SELECT 
  sc.customer_id,
  so.id as order_id,
  so.checkout_session_id,
  so.payment_intent_id,
  so.amount_subtotal,
  so.amount_total,
  so.currency,
  so.payment_status,
  so.status as order_status,
  so.created_at as order_date
FROM stripe_customers sc
LEFT JOIN stripe_orders so ON sc.customer_id = so.customer_id
WHERE sc.user_id = auth.uid() AND sc.deleted_at IS NULL;