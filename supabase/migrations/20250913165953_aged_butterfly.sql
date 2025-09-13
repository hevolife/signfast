/*
  # Système d'affiliation complet pour SignFast

  1. Nouvelles Tables
    - `users` - Table des utilisateurs (si manquante)
    - `affiliate_programs` - Programmes d'affiliation des utilisateurs
    - `affiliate_referrals` - Parrainages et commissions
    
  2. Fonctions
    - `activate_secret_code` - Activation des codes secrets
    - `create_affiliate_program` - Création automatique de programme d'affiliation
    
  3. Sécurité
    - Politiques RLS pour toutes les tables
    - Accès sécurisé aux données d'affiliation
    
  4. Triggers
    - Création automatique de programme d'affiliation à l'inscription
*/

-- Créer la table users si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz,
  email_change_token_current text DEFAULT '',
  email_change_confirm_status smallint DEFAULT 0,
  banned_until timestamptz,
  reauthentication_token text DEFAULT '',
  reauthentication_sent_at timestamptz,
  is_sso_user boolean DEFAULT false,
  deleted_at timestamptz
);

-- Activer RLS sur users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique (nécessaire pour l'affiliation)
CREATE POLICY "Allow public read access to users"
  ON users
  FOR SELECT
  TO public
  USING (true);

-- Politique pour permettre aux utilisateurs de lire leurs propres données
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Table des programmes d'affiliation
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric(5,2) DEFAULT 5.00 NOT NULL,
  total_referrals integer DEFAULT 0 NOT NULL,
  total_earnings numeric(10,2) DEFAULT 0.00 NOT NULL,
  monthly_earnings numeric(10,2) DEFAULT 0.00 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_code ON affiliate_programs(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_active ON affiliate_programs(is_active);

-- Activer RLS
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour affiliate_programs
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
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  );

-- Table des parrainages
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id text,
  commission_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
  commission_rate numeric(5,2) DEFAULT 5.00 NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_user ON affiliate_referrals(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user ON affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_created_at ON affiliate_referrals(created_at);

-- Contrainte unique pour éviter les doublons
ALTER TABLE affiliate_referrals ADD CONSTRAINT unique_affiliate_referral 
  UNIQUE (affiliate_user_id, referred_user_id);

-- Activer RLS
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour affiliate_referrals
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
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email')::text = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email')::text LIKE '%@admin.signfast.com'
  );

-- Fonction pour activer un code secret (manquante)
CREATE OR REPLACE FUNCTION activate_secret_code(code_input text, user_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record record;
  expires_at_value timestamptz;
  result jsonb;
BEGIN
  -- Rechercher le code secret
  SELECT * INTO code_record
  FROM secret_codes
  WHERE code = code_input
    AND is_active = true;
  
  -- Vérifier si le code existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret invalide ou inactif'
    );
  END IF;
  
  -- Vérifier si le code n'a pas atteint sa limite d'utilisation
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret épuisé'
    );
  END IF;
  
  -- Vérifier si le code n'est pas expiré (pour les codes avec date d'expiration)
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret expiré'
    );
  END IF;
  
  -- Vérifier si l'utilisateur n'a pas déjà utilisé ce code
  IF EXISTS (
    SELECT 1 FROM user_secret_codes 
    WHERE user_id = user_id_input AND code_id = code_record.id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret déjà utilisé'
    );
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
  
  -- Retourner le succès avec les détails
  RETURN jsonb_build_object(
    'success', true,
    'type', code_record.type,
    'expires_at', expires_at_value
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret déjà utilisé'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur lors de l''activation du code'
    );
END;
$$;

-- Fonction pour créer automatiquement un programme d'affiliation
CREATE OR REPLACE FUNCTION create_affiliate_program_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_affiliate_code text;
BEGIN
  -- Générer un code d'affiliation unique
  new_affiliate_code := 'AFF' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 8));
  
  -- Créer le programme d'affiliation
  INSERT INTO affiliate_programs (
    user_id,
    affiliate_code,
    commission_rate,
    is_active
  ) VALUES (
    NEW.id,
    new_affiliate_code,
    5.00, -- 5% de commission par défaut
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, ne pas bloquer la création de l'utilisateur
    RAISE WARNING 'Impossible de créer le programme d''affiliation pour %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger pour créer automatiquement un programme d'affiliation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_affiliate_program_trigger'
  ) THEN
    CREATE TRIGGER create_affiliate_program_trigger
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION create_affiliate_program_for_user();
  END IF;
END $$;

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
        AND created_at >= date_trunc('month', now())
    ),
    updated_at = now()
  WHERE user_id = NEW.affiliate_user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger pour mettre à jour les statistiques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_affiliate_stats_trigger'
  ) THEN
    CREATE TRIGGER update_affiliate_stats_trigger
      AFTER INSERT OR UPDATE ON affiliate_referrals
      FOR EACH ROW
      EXECUTE FUNCTION update_affiliate_stats();
  END IF;
END $$;