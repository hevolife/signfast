/*
  # Système de codes secrets pour débloquer l'abonnement

  1. Nouvelles Tables
    - `secret_codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Le code secret
      - `type` (text) - Type de déblocage ('monthly' ou 'lifetime')
      - `description` (text) - Description du code
      - `max_uses` (integer) - Nombre maximum d'utilisations (null = illimité)
      - `current_uses` (integer) - Nombre d'utilisations actuelles
      - `expires_at` (timestamp) - Date d'expiration (null = pas d'expiration)
      - `is_active` (boolean) - Si le code est actif
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_secret_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers users)
      - `code_id` (uuid, foreign key vers secret_codes)
      - `activated_at` (timestamp)
      - `expires_at` (timestamp) - Quand l'accès expire (null pour lifetime)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour permettre aux utilisateurs de voir leurs codes utilisés
    - Fonction pour valider et activer les codes

  3. Données d'exemple
    - Quelques codes de test
*/

-- Table des codes secrets
CREATE TABLE IF NOT EXISTS secret_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('monthly', 'lifetime')),
  description text DEFAULT '',
  max_uses integer DEFAULT NULL, -- NULL = illimité
  current_uses integer DEFAULT 0,
  expires_at timestamptz DEFAULT NULL, -- NULL = pas d'expiration
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des codes utilisés par les utilisateurs
CREATE TABLE IF NOT EXISTS user_secret_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id uuid NOT NULL REFERENCES secret_codes(id) ON DELETE CASCADE,
  activated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT NULL, -- NULL pour lifetime
  UNIQUE(user_id, code_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_secret_codes_code ON secret_codes(code);
CREATE INDEX IF NOT EXISTS idx_secret_codes_active ON secret_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_secret_codes_user_id ON user_secret_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_secret_codes_expires_at ON user_secret_codes(expires_at);

-- Enable RLS
ALTER TABLE secret_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secret_codes ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour secret_codes
-- Les utilisateurs ne peuvent pas voir les codes directement (sécurité)
CREATE POLICY "Les codes secrets ne sont pas visibles publiquement"
  ON secret_codes
  FOR SELECT
  TO authenticated
  USING (false); -- Personne ne peut lire directement les codes

-- Politiques RLS pour user_secret_codes
CREATE POLICY "Les utilisateurs peuvent voir leurs codes activés"
  ON user_secret_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent activer des codes"
  ON user_secret_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour valider et activer un code secret
CREATE OR REPLACE FUNCTION activate_secret_code(
  p_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record secret_codes%ROWTYPE;
  v_user_code_record user_secret_codes%ROWTYPE;
  v_expires_at timestamptz;
BEGIN
  -- Vérifier que l'utilisateur est connecté
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Utilisateur non connecté'
    );
  END IF;

  -- Récupérer le code secret
  SELECT * INTO v_code_record
  FROM secret_codes
  WHERE code = p_code AND is_active = true;

  -- Vérifier si le code existe
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code secret invalide ou inactif'
    );
  END IF;

  -- Vérifier si le code a expiré
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ce code a expiré'
    );
  END IF;

  -- Vérifier si le code a atteint sa limite d'utilisation
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ce code a atteint sa limite d''utilisation'
    );
  END IF;

  -- Vérifier si l'utilisateur a déjà utilisé ce code
  SELECT * INTO v_user_code_record
  FROM user_secret_codes
  WHERE user_id = p_user_id AND code_id = v_code_record.id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vous avez déjà utilisé ce code'
    );
  END IF;

  -- Calculer la date d'expiration selon le type
  IF v_code_record.type = 'monthly' THEN
    v_expires_at := now() + interval '1 month';
  ELSE
    v_expires_at := NULL; -- Lifetime
  END IF;

  -- Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (p_user_id, v_code_record.id, v_expires_at);

  -- Incrémenter le compteur d'utilisation
  UPDATE secret_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = v_code_record.id;

  -- Retourner le succès
  RETURN json_build_object(
    'success', true,
    'type', v_code_record.type,
    'description', v_code_record.description,
    'expires_at', v_expires_at
  );
END;
$$;

-- Fonction pour vérifier si un utilisateur a un accès premium actif
CREATE OR REPLACE FUNCTION has_premium_access(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_subscription boolean := false;
  v_has_active_code boolean := false;
BEGIN
  -- Vérifier que l'utilisateur est connecté
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier s'il a un abonnement Stripe actif
  SELECT EXISTS(
    SELECT 1 FROM stripe_user_subscriptions
    WHERE subscription_status IN ('active', 'trialing')
  ) INTO v_has_subscription;

  -- Vérifier s'il a un code secret actif
  SELECT EXISTS(
    SELECT 1 FROM user_secret_codes usc
    JOIN secret_codes sc ON usc.code_id = sc.id
    WHERE usc.user_id = p_user_id
    AND sc.is_active = true
    AND (usc.expires_at IS NULL OR usc.expires_at > now())
  ) INTO v_has_active_code;

  RETURN v_has_subscription OR v_has_active_code;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_secret_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_secret_codes_updated_at
  BEFORE UPDATE ON secret_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_secret_codes_updated_at();

-- Insérer quelques codes d'exemple
INSERT INTO secret_codes (code, type, description, max_uses) VALUES
  ('FORMBUILDER2024', 'lifetime', 'Code de lancement - Accès à vie', 100),
  ('MONTHLY30', 'monthly', 'Accès mensuel gratuit', 50),
  ('BETA2024', 'lifetime', 'Accès bêta testeurs', NULL),
  ('PROMO50', 'monthly', 'Code promo mensuel', 25),
  ('UNLIMITED', 'lifetime', 'Accès illimité VIP', 10)
ON CONFLICT (code) DO NOTHING;