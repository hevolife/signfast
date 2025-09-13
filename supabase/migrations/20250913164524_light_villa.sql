/*
  # Création du système d'affiliation

  1. Nouvelles Tables
    - `affiliate_programs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence vers auth.users)
      - `affiliate_code` (text, unique)
      - `commission_rate` (numeric, défaut 5%)
      - `total_referrals` (integer, défaut 0)
      - `total_earnings` (numeric, défaut 0)
      - `monthly_earnings` (numeric, défaut 0)
      - `is_active` (boolean, défaut true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `affiliate_referrals`
      - `id` (uuid, primary key)
      - `affiliate_user_id` (uuid)
      - `referred_user_id` (uuid)
      - `subscription_id` (text, nullable)
      - `commission_amount` (numeric, défaut 0)
      - `commission_rate` (numeric, défaut 5)
      - `status` (enum: pending, confirmed, paid, cancelled)
      - `created_at` (timestamptz)
      - `paid_at` (timestamptz, nullable)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour utilisateurs et admins
    - Vue admin pour statistiques

  3. Automatisation
    - Fonction de génération de codes uniques
    - Vue statistiques pour admin
*/

-- Créer l'enum pour le statut des parrainages
DO $$ BEGIN
  CREATE TYPE affiliate_referral_status AS ENUM ('pending', 'confirmed', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table des programmes d'affiliation
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 5.0 CHECK (commission_rate >= 0 AND commission_rate <= 50),
  total_referrals integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  monthly_earnings numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des parrainages
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  subscription_id text,
  commission_amount numeric DEFAULT 0,
  commission_rate numeric DEFAULT 5.0,
  status affiliate_referral_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_code ON affiliate_programs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_active ON affiliate_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_user ON affiliate_referrals(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created_at ON affiliate_referrals(created_at);

-- Contraintes d'unicité
DO $$
BEGIN
  ALTER TABLE affiliate_programs ADD CONSTRAINT unique_user_affiliate UNIQUE (user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE affiliate_referrals ADD CONSTRAINT unique_referral UNIQUE (affiliate_user_id, referred_user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Activer RLS
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour affiliate_programs
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

CREATE POLICY "Admins can manage all affiliate programs"
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

-- Politiques RLS pour affiliate_referrals
CREATE POLICY "Users can view their own referrals"
  ON affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (affiliate_user_id = auth.uid());

CREATE POLICY "System can create referrals"
  ON affiliate_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all referrals"
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

-- Fonction pour générer un code d'affiliation unique
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Générer un code au format SF + 8 caractères alphanumériques
    code := 'SF' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Vérifier l'unicité
    SELECT EXISTS(SELECT 1 FROM affiliate_programs WHERE affiliate_code = code) INTO exists;
    
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les statistiques d'affiliation
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS trigger AS $$
BEGIN
  -- Mettre à jour les statistiques du programme d'affiliation
  UPDATE affiliate_programs 
  SET 
    total_referrals = (
      SELECT COUNT(*) 
      FROM affiliate_referrals 
      WHERE affiliate_user_id = COALESCE(NEW.affiliate_user_id, OLD.affiliate_user_id)
    ),
    total_earnings = (
      SELECT COALESCE(SUM(commission_amount), 0) 
      FROM affiliate_referrals 
      WHERE affiliate_user_id = COALESCE(NEW.affiliate_user_id, OLD.affiliate_user_id)
        AND status IN ('confirmed', 'paid')
    ),
    monthly_earnings = (
      SELECT COALESCE(SUM(commission_amount), 0) 
      FROM affiliate_referrals 
      WHERE affiliate_user_id = COALESCE(NEW.affiliate_user_id, OLD.affiliate_user_id)
        AND status IN ('confirmed', 'paid')
        AND created_at >= date_trunc('month', now())
    ),
    updated_at = now()
  WHERE user_id = COALESCE(NEW.affiliate_user_id, OLD.affiliate_user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les statistiques
DROP TRIGGER IF EXISTS update_affiliate_stats_trigger ON affiliate_referrals;
CREATE TRIGGER update_affiliate_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_stats();

-- Vue pour les statistiques d'affiliation (admin)
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
  COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.status IN ('confirmed', 'paid')), 0) as total_commissions
FROM affiliate_programs ap
LEFT JOIN affiliate_referrals ar ON ap.user_id = ar.affiliate_user_id
GROUP BY ap.user_id, ap.affiliate_code, ap.commission_rate, ap.total_referrals, ap.total_earnings, ap.monthly_earnings, ap.is_active;

-- Fonction pour activer un code secret
CREATE OR REPLACE FUNCTION activate_secret_code(code_input text, user_id_input uuid)
RETURNS json AS $$
DECLARE
  secret_code_record record;
  user_code_record record;
  expires_at_value timestamptz;
  result json;
BEGIN
  -- Vérifier que le code existe et est actif
  SELECT * INTO secret_code_record
  FROM secret_codes 
  WHERE code = code_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code secret invalide ou inactif');
  END IF;
  
  -- Vérifier si le code a encore des utilisations disponibles
  IF secret_code_record.max_uses IS NOT NULL AND secret_code_record.current_uses >= secret_code_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Code secret épuisé');
  END IF;
  
  -- Vérifier si le code n'est pas expiré (pour les codes avec date d'expiration)
  IF secret_code_record.expires_at IS NOT NULL AND secret_code_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Code secret expiré');
  END IF;
  
  -- Vérifier si l'utilisateur n'a pas déjà activé ce code
  SELECT * INTO user_code_record
  FROM user_secret_codes 
  WHERE user_id = user_id_input AND code_id = secret_code_record.id;
  
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code déjà activé par cet utilisateur');
  END IF;
  
  -- Calculer la date d'expiration pour l'utilisateur
  IF secret_code_record.type = 'monthly' THEN
    expires_at_value := now() + interval '30 days';
  ELSE
    expires_at_value := NULL; -- Pas d'expiration pour les codes à vie
  END IF;
  
  -- Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (user_id_input, secret_code_record.id, expires_at_value);
  
  -- Incrémenter le compteur d'utilisations
  UPDATE secret_codes 
  SET current_uses = current_uses + 1
  WHERE id = secret_code_record.id;
  
  -- Retourner le succès avec les détails
  result := json_build_object(
    'success', true,
    'type', secret_code_record.type,
    'expires_at', expires_at_value,
    'description', secret_code_record.description
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;