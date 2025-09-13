/*
  # Système d'affiliation SignFast

  1. Nouvelles Tables
    - `affiliate_programs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence vers users)
      - `affiliate_code` (text, unique)
      - `commission_rate` (decimal, taux de commission en %)
      - `total_referrals` (integer, nombre total de parrainages)
      - `total_earnings` (decimal, gains totaux)
      - `is_active` (boolean, programme actif)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `affiliate_referrals`
      - `id` (uuid, primary key)
      - `affiliate_user_id` (uuid, utilisateur parrain)
      - `referred_user_id` (uuid, utilisateur parrainé)
      - `subscription_id` (text, ID abonnement Stripe)
      - `commission_amount` (decimal, montant de la commission)
      - `commission_rate` (decimal, taux appliqué)
      - `status` (enum, statut du parrainage)
      - `created_at` (timestamp)
      - `paid_at` (timestamp, date de paiement)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour lecture/écriture des données d'affiliation
    - Accès admin pour gestion des commissions

  3. Fonctions
    - Trigger pour création automatique du programme d'affiliation
    - Fonction pour calculer les gains mensuels
*/

-- Type enum pour le statut des parrainages
CREATE TYPE affiliate_referral_status AS ENUM ('pending', 'confirmed', 'paid', 'cancelled');

-- Table des programmes d'affiliation
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate decimal(5,2) DEFAULT 5.00 NOT NULL,
  total_referrals integer DEFAULT 0 NOT NULL,
  total_earnings decimal(10,2) DEFAULT 0.00 NOT NULL,
  monthly_earnings decimal(10,2) DEFAULT 0.00 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des parrainages
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id text,
  commission_amount decimal(10,2) DEFAULT 0.00 NOT NULL,
  commission_rate decimal(5,2) DEFAULT 5.00 NOT NULL,
  status affiliate_referral_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  UNIQUE(affiliate_user_id, referred_user_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_code ON affiliate_programs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_user ON affiliate_referrals(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created_at ON affiliate_referrals(created_at);

-- Enable RLS
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour affiliate_programs
CREATE POLICY "Users can read own affiliate program"
  ON affiliate_programs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own affiliate program"
  ON affiliate_programs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all affiliate programs"
  ON affiliate_programs
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  );

-- Politiques RLS pour affiliate_referrals
CREATE POLICY "Users can read own referrals"
  ON affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "System can insert referrals"
  ON affiliate_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all referrals"
  ON affiliate_referrals
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  );

-- Fonction pour créer automatiquement un programme d'affiliation
CREATE OR REPLACE FUNCTION create_affiliate_program_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Générer un code d'affiliation unique
  INSERT INTO affiliate_programs (user_id, affiliate_code)
  VALUES (
    NEW.id,
    'SF' || UPPER(SUBSTRING(MD5(NEW.id::text || EXTRACT(EPOCH FROM NOW())::text), 1, 8))
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement le programme d'affiliation
DROP TRIGGER IF EXISTS create_affiliate_program_trigger ON users;
CREATE TRIGGER create_affiliate_program_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_program_for_user();

-- Fonction pour mettre à jour les statistiques d'affiliation
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les statistiques du parrain
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
      AND status = 'confirmed'
    ),
    monthly_earnings = (
      SELECT COALESCE(SUM(commission_amount), 0) 
      FROM affiliate_referrals 
      WHERE affiliate_user_id = NEW.affiliate_user_id 
      AND status = 'confirmed'
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ),
    updated_at = now()
  WHERE user_id = NEW.affiliate_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour les stats
DROP TRIGGER IF EXISTS update_affiliate_stats_trigger ON affiliate_referrals;
CREATE TRIGGER update_affiliate_stats_trigger
  AFTER INSERT OR UPDATE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_stats();

-- Fonction pour calculer les gains mensuels
CREATE OR REPLACE FUNCTION get_monthly_affiliate_earnings(user_id_param uuid)
RETURNS decimal AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(commission_amount), 0)
    FROM affiliate_referrals
    WHERE affiliate_user_id = user_id_param
    AND status = 'confirmed'
    AND created_at >= date_trunc('month', CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vue pour les statistiques d'affiliation
CREATE OR REPLACE VIEW affiliate_stats AS
SELECT 
  ap.user_id,
  ap.affiliate_code,
  ap.commission_rate,
  ap.total_referrals,
  ap.total_earnings,
  ap.monthly_earnings,
  ap.is_active,
  COUNT(ar.id) FILTER (WHERE ar.status = 'confirmed') as confirmed_referrals,
  COUNT(ar.id) FILTER (WHERE ar.status = 'pending') as pending_referrals,
  COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.status = 'confirmed'), 0) as total_commissions
FROM affiliate_programs ap
LEFT JOIN affiliate_referrals ar ON ap.user_id = ar.affiliate_user_id
GROUP BY ap.user_id, ap.affiliate_code, ap.commission_rate, ap.total_referrals, 
         ap.total_earnings, ap.monthly_earnings, ap.is_active;