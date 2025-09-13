/*
  # Create affiliate system tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamp)
    - `affiliate_programs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `affiliate_code` (text, unique)
      - `commission_rate` (numeric, default 5%)
      - `total_referrals` (integer, default 0)
      - `total_earnings` (numeric, default 0)
      - `monthly_earnings` (numeric, default 0)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `affiliate_referrals`
      - `id` (uuid, primary key)
      - `affiliate_user_id` (uuid, foreign key to users)
      - `referred_user_id` (uuid, foreign key to users)
      - `subscription_id` (text, nullable)
      - `commission_amount` (numeric, default 0)
      - `commission_rate` (numeric, default 5%)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)
      - `paid_at` (timestamp, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own affiliate data
    - Add admin policies for super admins

  3. Functions
    - `activate_secret_code` function for secret code activation
    - Trigger functions for updated_at columns
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create affiliate_programs table
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 5.0 NOT NULL,
  total_referrals integer DEFAULT 0 NOT NULL,
  total_earnings numeric DEFAULT 0.0 NOT NULL,
  monthly_earnings numeric DEFAULT 0.0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;

-- Policies for affiliate_programs
CREATE POLICY "Users can read own affiliate program"
  ON affiliate_programs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own affiliate program"
  ON affiliate_programs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all affiliate programs"
  ON affiliate_programs
  FOR ALL
  TO authenticated
  USING (
    (jwt() ->> 'email') = 'admin@signfast.com' OR 
    (jwt() ->> 'email') LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (jwt() ->> 'email') = 'admin@signfast.com' OR 
    (jwt() ->> 'email') LIKE '%@admin.signfast.com'
  );

-- Create affiliate_referrals table
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id text,
  commission_amount numeric DEFAULT 0.0 NOT NULL,
  commission_rate numeric DEFAULT 5.0 NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Policies for affiliate_referrals
CREATE POLICY "Users can read own referrals"
  ON affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Super admins can manage all referrals"
  ON affiliate_referrals
  FOR ALL
  TO authenticated
  USING (
    (jwt() ->> 'email') = 'admin@signfast.com' OR 
    (jwt() ->> 'email') LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (jwt() ->> 'email') = 'admin@signfast.com' OR 
    (jwt() ->> 'email') LIKE '%@admin.signfast.com'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_affiliate_code ON affiliate_programs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_user_id ON affiliate_referrals(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user_id ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_affiliate_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for affiliate_programs
DROP TRIGGER IF EXISTS update_affiliate_programs_updated_at ON affiliate_programs;
CREATE TRIGGER update_affiliate_programs_updated_at
  BEFORE UPDATE ON affiliate_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_programs_updated_at();

-- Create function to activate secret codes
CREATE OR REPLACE FUNCTION activate_secret_code(code_input text, user_id_input uuid)
RETURNS json AS $$
DECLARE
  code_record record;
  user_code_record record;
  expires_at_value timestamptz;
BEGIN
  -- Vérifier si le code existe et est actif
  SELECT * INTO code_record
  FROM secret_codes
  WHERE code = code_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code secret invalide ou inactif');
  END IF;
  
  -- Vérifier si le code n'a pas atteint sa limite d'utilisation
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Code secret épuisé');
  END IF;
  
  -- Vérifier si le code n'est pas expiré (pour les codes avec date d'expiration)
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Code secret expiré');
  END IF;
  
  -- Vérifier si l'utilisateur n'a pas déjà utilisé ce code
  SELECT * INTO user_code_record
  FROM user_secret_codes
  WHERE user_id = user_id_input AND code_id = code_record.id;
  
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code déjà utilisé par cet utilisateur');
  END IF;
  
  -- Calculer la date d'expiration pour l'utilisateur
  IF code_record.type = 'monthly' THEN
    expires_at_value := now() + interval '30 days';
  ELSE
    expires_at_value := NULL; -- Pas d'expiration pour les codes à vie
  END IF;
  
  -- Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (user_id_input, code_record.id, expires_at_value);
  
  -- Incrémenter le compteur d'utilisation
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;
  
  RETURN json_build_object(
    'success', true,
    'type', code_record.type,
    'expires_at', expires_at_value,
    'description', code_record.description
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Erreur lors de l''activation: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;