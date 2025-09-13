/*
  # Création du système d'affiliation

  1. Nouvelles Tables
    - `affiliate_programs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers users)
      - `affiliate_code` (text, unique)
      - `commission_rate` (numeric, défaut 5%)
      - `total_referrals` (integer, défaut 0)
      - `total_earnings` (numeric, défaut 0)
      - `monthly_earnings` (numeric, défaut 0)
      - `is_active` (boolean, défaut true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `affiliate_referrals`
      - `id` (uuid, primary key)
      - `affiliate_user_id` (uuid, foreign key vers users)
      - `referred_user_id` (uuid, foreign key vers users)
      - `subscription_id` (text, nullable)
      - `commission_amount` (numeric, défaut 0)
      - `commission_rate` (numeric, défaut 5)
      - `status` (enum: pending, confirmed, paid, cancelled)
      - `created_at` (timestamp)
      - `paid_at` (timestamp, nullable)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour que les utilisateurs voient leurs données
    - Accès admin pour les super administrateurs

  3. Automatisation
    - Trigger pour créer automatiquement un programme d'affiliation
    - Fonction de génération de codes uniques
    - Vue pour les statistiques admin

  4. Fonctions
    - `generate_affiliate_code()` : Génère un code unique
    - `create_affiliate_program()` : Crée un programme pour un utilisateur
    - Vue `affiliate_stats` pour l'administration
*/

-- Créer l'enum pour le statut des parrainages
CREATE TYPE affiliate_referral_status AS ENUM ('pending', 'confirmed', 'paid', 'cancelled');

-- Table des programmes d'affiliation
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 5.0 CHECK (commission_rate >= 0 AND commission_rate <= 50),
  total_referrals integer DEFAULT 0 CHECK (total_referrals >= 0),
  total_earnings numeric DEFAULT 0 CHECK (total_earnings >= 0),
  monthly_earnings numeric DEFAULT 0 CHECK (monthly_earnings >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des parrainages
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id text,
  commission_amount numeric DEFAULT 0 CHECK (commission_amount >= 0),
  commission_rate numeric DEFAULT 5.0 CHECK (commission_rate >= 0 AND commission_rate <= 50),
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
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created_at ON affiliate_referrals(created_at DESC);

-- Contraintes d'unicité
ALTER TABLE affiliate_programs ADD CONSTRAINT unique_user_affiliate UNIQUE (user_id);
ALTER TABLE affiliate_referrals ADD CONSTRAINT unique_affiliate_referred UNIQUE (affiliate_user_id, referred_user_id);

-- Fonction pour générer un code d'affiliation unique
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Générer un code au format SF + 8 caractères alphanumériques
    code := 'SF' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Vérifier l'unicité
    SELECT EXISTS(SELECT 1 FROM affiliate_programs WHERE affiliate_code = code) INTO exists_check;
    
    -- Sortir de la boucle si le code est unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Fonction pour créer un programme d'affiliation
CREATE OR REPLACE FUNCTION create_affiliate_program_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer un programme d'affiliation pour le nouvel utilisateur
  INSERT INTO affiliate_programs (user_id, affiliate_code)
  VALUES (NEW.id, generate_affiliate_code());
  
  RETURN NEW;
END;
$$;

-- Trigger pour créer automatiquement un programme d'affiliation
CREATE OR REPLACE TRIGGER trigger_create_affiliate_program
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_program_for_user();

-- Fonction pour mettre à jour les statistiques d'affiliation
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Trigger pour mettre à jour les statistiques
CREATE OR REPLACE TRIGGER trigger_update_affiliate_stats
  AFTER INSERT OR UPDATE OR DELETE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_stats();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_affiliate_programs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger pour updated_at
CREATE OR REPLACE TRIGGER trigger_update_affiliate_programs_updated_at
  BEFORE UPDATE ON affiliate_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_programs_updated_at();

-- Activer RLS
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

CREATE POLICY "System can update referrals"
  ON affiliate_referrals
  FOR UPDATE
  TO authenticated
  USING (true)
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

-- Vue pour les statistiques admin
CREATE OR REPLACE VIEW affiliate_stats AS
SELECT 
  ap.user_id,
  ap.affiliate_code,
  ap.commission_rate,
  ap.total_referrals,
  ap.total_earnings,
  ap.monthly_earnings,
  ap.is_active,
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

-- Créer des programmes d'affiliation pour tous les utilisateurs existants
INSERT INTO affiliate_programs (user_id, affiliate_code)
SELECT id, generate_affiliate_code()
FROM users
WHERE id NOT IN (SELECT user_id FROM affiliate_programs)
ON CONFLICT (user_id) DO NOTHING;