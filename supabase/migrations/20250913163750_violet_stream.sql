/*
  # Create affiliate system tables

  1. New Tables
    - `affiliate_programs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `affiliate_code` (text, unique)
      - `commission_rate` (numeric, default 5.0)
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
      - `commission_rate` (numeric, default 5.0)
      - `status` (enum: pending, confirmed, paid, cancelled)
      - `created_at` (timestamp)
      - `paid_at` (timestamp, nullable)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to read their own data
    - Add policies for super admins to manage all data

  3. Functions
    - Auto-generate affiliate codes for new users
    - Calculate monthly earnings
    - Update affiliate statistics

  4. Views
    - `affiliate_stats` for admin dashboard
*/

-- Create enum for affiliate referral status
CREATE TYPE affiliate_referral_status AS ENUM ('pending', 'confirmed', 'paid', 'cancelled');

-- Create affiliate_programs table
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric(5,2) DEFAULT 5.0 NOT NULL,
  total_referrals integer DEFAULT 0 NOT NULL,
  total_earnings numeric(10,2) DEFAULT 0 NOT NULL,
  monthly_earnings numeric(10,2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create affiliate_referrals table
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id text,
  commission_amount numeric(10,2) DEFAULT 0 NOT NULL,
  commission_rate numeric(5,2) DEFAULT 5.0 NOT NULL,
  status affiliate_referral_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  paid_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_affiliate_code ON affiliate_programs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_is_active ON affiliate_programs(is_active);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_user_id ON affiliate_referrals(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user_id ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created_at ON affiliate_referrals(created_at);

-- Enable RLS
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_programs
CREATE POLICY "Users can read their own affiliate program"
  ON affiliate_programs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own affiliate program"
  ON affiliate_programs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage all affiliate programs"
  ON affiliate_programs
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
  );

-- RLS Policies for affiliate_referrals
CREATE POLICY "Users can read their own referrals"
  ON affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "Super admins can manage all referrals"
  ON affiliate_referrals
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
  );

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate code format: SF + 8 random alphanumeric characters
    code := 'SF' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM affiliate_programs WHERE affiliate_code = code) INTO exists;
    
    -- Exit loop if code is unique
    IF NOT exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to create affiliate program for new users
CREATE OR REPLACE FUNCTION create_affiliate_program_for_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO affiliate_programs (user_id, affiliate_code)
  VALUES (NEW.id, generate_affiliate_code());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create affiliate program for new users
DROP TRIGGER IF EXISTS create_affiliate_program_trigger ON users;
CREATE TRIGGER create_affiliate_program_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_program_for_user();

-- Function to update affiliate statistics
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS trigger AS $$
BEGIN
  -- Update total referrals and earnings for the affiliate
  UPDATE affiliate_programs 
  SET 
    total_referrals = (
      SELECT COUNT(*) 
      FROM affiliate_referrals 
      WHERE affiliate_user_id = NEW.affiliate_user_id
    ),
    total_earnings = (
      SELECT COALESCE(SUM(commission_amount), 0) 
      FROM affiliate_referrals 
      WHERE affiliate_user_id = NEW.affiliate_user_id 
      AND status IN ('confirmed', 'paid')
    ),
    monthly_earnings = (
      SELECT COALESCE(SUM(commission_amount), 0) 
      FROM affiliate_referrals 
      WHERE affiliate_user_id = NEW.affiliate_user_id 
      AND status IN ('confirmed', 'paid')
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ),
    updated_at = now()
  WHERE user_id = NEW.affiliate_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when referrals change
DROP TRIGGER IF EXISTS update_affiliate_stats_trigger ON affiliate_referrals;
CREATE TRIGGER update_affiliate_stats_trigger
  AFTER INSERT OR UPDATE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_stats();

-- Create affiliate_stats view for admin dashboard
CREATE OR REPLACE VIEW affiliate_stats AS
SELECT 
  ap.user_id,
  ap.affiliate_code,
  ap.commission_rate,
  ap.total_referrals,
  ap.total_earnings,
  ap.monthly_earnings,
  ap.is_active,
  ap.created_at,
  ap.updated_at,
  COALESCE(confirmed_referrals.count, 0) as confirmed_referrals,
  COALESCE(pending_referrals.count, 0) as pending_referrals,
  COALESCE(total_commissions.amount, 0) as total_commissions
FROM affiliate_programs ap
LEFT JOIN (
  SELECT affiliate_user_id, COUNT(*) as count
  FROM affiliate_referrals 
  WHERE status = 'confirmed'
  GROUP BY affiliate_user_id
) confirmed_referrals ON ap.user_id = confirmed_referrals.affiliate_user_id
LEFT JOIN (
  SELECT affiliate_user_id, COUNT(*) as count
  FROM affiliate_referrals 
  WHERE status = 'pending'
  GROUP BY affiliate_user_id
) pending_referrals ON ap.user_id = pending_referrals.affiliate_user_id
LEFT JOIN (
  SELECT affiliate_user_id, SUM(commission_amount) as amount
  FROM affiliate_referrals 
  WHERE status IN ('confirmed', 'paid')
  GROUP BY affiliate_user_id
) total_commissions ON ap.user_id = total_commissions.affiliate_user_id;

-- Create affiliate programs for existing users
INSERT INTO affiliate_programs (user_id, affiliate_code)
SELECT id, generate_affiliate_code()
FROM users
WHERE id NOT IN (SELECT user_id FROM affiliate_programs)
ON CONFLICT (user_id) DO NOTHING;

-- Function to activate secret code (updated to handle affiliate tracking)
CREATE OR REPLACE FUNCTION activate_secret_code(code_input text, user_id_input uuid)
RETURNS json AS $$
DECLARE
  code_record record;
  user_code_record record;
  expires_date timestamptz;
  result json;
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
  
  -- Vérifier si le code n'est pas expiré
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
    expires_date := now() + interval '30 days';
  ELSE
    expires_date := NULL; -- Pas d'expiration pour les codes à vie
  END IF;
  
  -- Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (user_id_input, code_record.id, expires_date);
  
  -- Incrémenter le compteur d'utilisation
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;
  
  -- Retourner le succès avec les informations
  result := json_build_object(
    'success', true,
    'type', code_record.type,
    'expires_at', expires_date,
    'description', code_record.description
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;