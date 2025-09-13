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
      - `status` (text, default 'pending')
      - `created_at` (timestamp)
      - `paid_at` (timestamp, nullable)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own affiliate data
    - Add policies for admins to manage all affiliate data

  3. Functions
    - Auto-generate affiliate code on user creation
    - Update affiliate statistics automatically
*/

-- Create affiliate_programs table
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 5.0 NOT NULL,
  total_referrals integer DEFAULT 0 NOT NULL,
  total_earnings numeric DEFAULT 0 NOT NULL,
  monthly_earnings numeric DEFAULT 0 NOT NULL,
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
  commission_amount numeric DEFAULT 0 NOT NULL,
  commission_rate numeric DEFAULT 5.0 NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  paid_at timestamptz
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_code ON affiliate_programs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_user_id ON affiliate_referrals(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user_id ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);

-- Enable Row Level Security
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Policies for affiliate_programs
CREATE POLICY "Users can view their own affiliate program"
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

-- Policies for affiliate_referrals
CREATE POLICY "Users can view their own referrals"
  ON affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "System can insert referrals"
  ON affiliate_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

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
    -- Generate a random 10-character code with SF prefix
    code := 'SF' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM affiliate_programs WHERE affiliate_code = code) INTO exists;
    
    -- If code doesn't exist, return it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
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

-- Trigger to automatically create affiliate program for new users
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

-- Trigger to update affiliate stats when referrals change
DROP TRIGGER IF EXISTS update_affiliate_stats_trigger ON affiliate_referrals;
CREATE TRIGGER update_affiliate_stats_trigger
  AFTER INSERT OR UPDATE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_stats();

-- Create affiliate programs for existing users
INSERT INTO affiliate_programs (user_id, affiliate_code)
SELECT id, generate_affiliate_code()
FROM users
WHERE id NOT IN (SELECT user_id FROM affiliate_programs)
ON CONFLICT (user_id) DO NOTHING;

-- Create view for affiliate stats (for admin panel)
CREATE OR REPLACE VIEW affiliate_stats AS
SELECT 
  ap.id,
  ap.user_id,
  ap.affiliate_code,
  ap.commission_rate,
  ap.total_referrals,
  ap.total_earnings,
  ap.monthly_earnings,
  ap.is_active,
  ap.created_at,
  up.first_name,
  up.last_name,
  up.company_name,
  u.email,
  COUNT(ar.id) FILTER (WHERE ar.status = 'confirmed') as confirmed_referrals,
  COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.status IN ('confirmed', 'paid')), 0) as total_commission_paid
FROM affiliate_programs ap
LEFT JOIN users u ON ap.user_id = u.id
LEFT JOIN user_profiles up ON ap.user_id = up.user_id
LEFT JOIN affiliate_referrals ar ON ap.user_id = ar.affiliate_user_id
GROUP BY ap.id, ap.user_id, ap.affiliate_code, ap.commission_rate, ap.total_referrals, 
         ap.total_earnings, ap.monthly_earnings, ap.is_active, ap.created_at,
         up.first_name, up.last_name, up.company_name, u.email;