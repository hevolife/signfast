/*
  # Recréation complète du système de codes secrets

  1. Suppression et recréation des tables
    - `secret_codes` : codes disponibles
    - `user_secret_codes` : codes activés par les utilisateurs

  2. Fonction d'activation des codes
    - Validation complète du code
    - Gestion des utilisations
    - Activation pour l'utilisateur

  3. Sécurité
    - RLS activé sur toutes les tables
    - Politiques d'accès appropriées
*/

-- Supprimer les anciennes fonctions et tables
DROP FUNCTION IF EXISTS activate_secret_code(text, uuid);
DROP TABLE IF EXISTS user_secret_codes CASCADE;
DROP TABLE IF EXISTS secret_codes CASCADE;
DROP TYPE IF EXISTS secret_code_type CASCADE;

-- Créer le type enum pour les codes secrets
CREATE TYPE secret_code_type AS ENUM ('monthly', 'lifetime');

-- Table des codes secrets disponibles
CREATE TABLE secret_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type secret_code_type NOT NULL,
  description text DEFAULT '',
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des codes activés par les utilisateurs
CREATE TABLE user_secret_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id uuid NOT NULL REFERENCES secret_codes(id) ON DELETE CASCADE,
  activated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, code_id)
);

-- Activer RLS
ALTER TABLE secret_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secret_codes ENABLE ROW LEVEL SECURITY;

-- Politiques pour secret_codes (lecture publique limitée, gestion admin)
CREATE POLICY "Public can check code existence"
  ON secret_codes
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage secret codes"
  ON secret_codes
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR 
    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com'
  );

-- Politiques pour user_secret_codes
CREATE POLICY "Users can view their own activated codes"
  ON user_secret_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can activate codes"
  ON user_secret_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fonction d'activation des codes secrets
CREATE OR REPLACE FUNCTION activate_secret_code(
  code_input text,
  user_id_input uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record secret_codes%ROWTYPE;
  user_code_record user_secret_codes%ROWTYPE;
  calculated_expires_at timestamptz;
BEGIN
  -- Log de début
  RAISE NOTICE 'Activation code: % pour user: %', code_input, user_id_input;
  
  -- 1. Vérifier que le code existe et est actif
  SELECT * INTO code_record
  FROM secret_codes
  WHERE code = UPPER(code_input) AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Code non trouvé ou inactif: %', code_input;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret invalide ou inactif'
    );
  END IF;
  
  RAISE NOTICE 'Code trouvé: % (type: %, max_uses: %, current_uses: %)', 
    code_record.code, code_record.type, code_record.max_uses, code_record.current_uses;
  
  -- 2. Vérifier si le code a expiré
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at <= now() THEN
    RAISE NOTICE 'Code expiré: %', code_record.expires_at;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code secret a expiré'
    );
  END IF;
  
  -- 3. Vérifier les utilisations restantes
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RAISE NOTICE 'Code épuisé: % >= %', code_record.current_uses, code_record.max_uses;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code secret a atteint sa limite d''utilisation'
    );
  END IF;
  
  -- 4. Vérifier si l'utilisateur a déjà activé ce code
  SELECT * INTO user_code_record
  FROM user_secret_codes
  WHERE user_id = user_id_input AND code_id = code_record.id;
  
  IF FOUND THEN
    RAISE NOTICE 'Code déjà activé par cet utilisateur';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vous avez déjà activé ce code secret'
    );
  END IF;
  
  -- 5. Calculer la date d'expiration pour l'utilisateur
  IF code_record.type = 'lifetime' THEN
    calculated_expires_at := NULL; -- Pas d'expiration
    RAISE NOTICE 'Code à vie - pas d''expiration';
  ELSE
    calculated_expires_at := now() + interval '30 days';
    RAISE NOTICE 'Code mensuel - expire le: %', calculated_expires_at;
  END IF;
  
  -- 6. Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (user_id_input, code_record.id, calculated_expires_at);
  
  RAISE NOTICE 'Code activé avec succès pour l''utilisateur';
  
  -- 7. Incrémenter le compteur d'utilisations
  UPDATE secret_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = code_record.id;
  
  RAISE NOTICE 'Compteur mis à jour: %', code_record.current_uses + 1;
  
  -- 8. Retourner le succès avec les détails
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Code secret activé avec succès',
    'type', code_record.type,
    'expires_at', calculated_expires_at,
    'description', code_record.description
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur lors de l''activation: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur interne: ' || SQLERRM
    );
END;
$$;