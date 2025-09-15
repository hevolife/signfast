/*
  # Create affiliate system

  1. New Tables
    - `affiliate_programs` - User affiliate programs
    - `affiliate_referrals` - Referral tracking
  
  2. Security
    - Enable RLS on both tables
    - Users can manage their own programs
    - Track referrals securely
  
  3. Functions
    - Auto-update affiliate stats
    - Create affiliate programs for new users
*/

-- Create affiliate_programs table
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric(5,2) DEFAULT 5.00,
  total_referrals integer DEFAULT 0,
  total_earnings numeric(10,2) DEFAULT 0.00,
  monthly_earnings numeric(10,2) DEFAULT 0.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create affiliate_referrals table
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  subscription_id text,
  commission_amount numeric(10,2) DEFAULT 0.00,
  commission_rate numeric(5,2) DEFAULT 5.00,
  status text DEFAULT 'pending'::text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  FOREIGN KEY (affiliate_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_affiliate_referral UNIQUE (affiliate_user_id, referred_user_id),
  CONSTRAINT affiliate_referrals_status_check CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'paid'::text, 'cancelled'::text]))
);

-- Enable RLS
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_programs
CREATE POLICY "Users can read own affiliate program"
  ON affiliate_programs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own affiliate program"
  ON affiliate_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own affiliate program"
  ON affiliate_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

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
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  )
  WITH CHECK (
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  );

-- RLS Policies for affiliate_referrals
CREATE POLICY "Users can read own referrals"
  ON affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = affiliate_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can insert referrals"
  ON affiliate_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = affiliate_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Super admins can manage all referrals"
  ON affiliate_referrals
  FOR ALL
  TO authenticated
  USING (
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  )
  WITH CHECK (
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_code ON affiliate_programs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_active ON affiliate_programs(is_active);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_user ON affiliate_referrals(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created_at ON affiliate_referrals(created_at);

-- Create function to update affiliate stats
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update affiliate program stats when referral changes
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE affiliate_programs 
    SET 
      total_referrals = (
        SELECT COUNT(*) FROM affiliate_referrals 
        WHERE affiliate_user_id = NEW.affiliate_user_id
      ),
      total_earnings = (
        SELECT COALESCE(SUM(commission_amount), 0) FROM affiliate_referrals 
        WHERE affiliate_user_id = NEW.affiliate_user_id AND status = 'confirmed'
      ),
      monthly_earnings = (
        SELECT COALESCE(SUM(commission_amount), 0) FROM affiliate_referrals 
        WHERE affiliate_user_id = NEW.affiliate_user_id 
        AND status = 'confirmed'
        AND created_at >= date_trunc('month', now())
      )
    WHERE user_id = NEW.affiliate_user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for affiliate stats
CREATE TRIGGER update_affiliate_stats_trigger
  AFTER INSERT OR UPDATE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_stats();

-- Update the affiliate program creation function
CREATE OR REPLACE FUNCTION create_affiliate_program_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create affiliate program for new user
  INSERT INTO affiliate_programs (
    user_id,
    affiliate_code,
    commission_rate,
    total_referrals,
    total_earnings,
    monthly_earnings,
    is_active
  ) VALUES (
    NEW.user_id,
    'AF' || UPPER(SUBSTRING(NEW.user_id::text, 1, 8)) || EXTRACT(epoch FROM now())::bigint % 10000,
    5.00,
    0,
    0.00,
    0.00,
    true
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors to prevent blocking user creation
    RETURN NEW;
END;
$$;