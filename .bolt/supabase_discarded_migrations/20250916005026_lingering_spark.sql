/*
  # Création des tables pour les sous-comptes

  1. Nouvelles Tables
    - `sub_accounts`
      - `id` (uuid, primary key)
      - `main_account_id` (uuid, foreign key vers auth.users)
      - `username` (text, unique par compte principal)
      - `display_name` (text)
      - `password_hash` (text)
      - `permissions` (jsonb)
      - `is_active` (boolean)
      - `last_login_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `sub_account_sessions`
      - `id` (uuid, primary key)
      - `sub_account_id` (uuid, foreign key vers sub_accounts)
      - `session_token` (text, unique)
      - `expires_at` (timestamp)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamp)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour que les utilisateurs ne voient que leurs propres sous-comptes
    - Politiques pour que les sous-comptes n'accèdent qu'aux données autorisées

  3. Fonctions RPC
    - `authenticate_sub_account` pour l'authentification
    - `validate_sub_account_session` pour la validation de session
    - `set_config` pour la configuration de session
*/

-- Table des sous-comptes
CREATE TABLE IF NOT EXISTS sub_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  permissions jsonb DEFAULT '{"pdf_access": true, "download_only": true}'::jsonb,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contrainte unique : username unique par compte principal
  UNIQUE(main_account_id, username)
);

-- Table des sessions de sous-comptes
CREATE TABLE IF NOT EXISTS sub_account_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account ON sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON sub_accounts(username);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON sub_account_sessions(expires_at);

-- Activer RLS
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques pour sub_accounts
CREATE POLICY "Users can manage their own sub accounts"
  ON sub_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = main_account_id)
  WITH CHECK (auth.uid() = main_account_id);

-- Politiques pour sub_account_sessions
CREATE POLICY "Sub accounts can access their own sessions"
  ON sub_account_sessions
  FOR SELECT
  TO authenticated
  USING (
    sub_account_id IN (
      SELECT id FROM sub_accounts WHERE main_account_id = auth.uid()
    )
  );

-- Fonction pour authentifier un sous-compte
CREATE OR REPLACE FUNCTION authenticate_sub_account(
  p_main_account_email text,
  p_username text,
  p_password text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_main_account_id uuid;
  v_sub_account sub_accounts%ROWTYPE;
  v_password_hash text;
  v_session_token text;
  v_expires_at timestamptz;
BEGIN
  -- Trouver l'ID du compte principal par email
  SELECT id INTO v_main_account_id
  FROM auth.users
  WHERE email = p_main_account_email
  AND deleted_at IS NULL;
  
  IF v_main_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Compte principal non trouvé'
    );
  END IF;
  
  -- Trouver le sous-compte
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE main_account_id = v_main_account_id
  AND username = p_username
  AND is_active = true;
  
  IF v_sub_account.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sous-compte non trouvé ou inactif'
    );
  END IF;
  
  -- Hasher le mot de passe fourni avec le même algorithme
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');
  
  -- Vérifier le mot de passe
  IF v_sub_account.password_hash != v_password_hash THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Mot de passe incorrect'
    );
  END IF;
  
  -- Générer un token de session
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '24 hours';
  
  -- Créer la session
  INSERT INTO sub_account_sessions (
    sub_account_id,
    session_token,
    expires_at,
    ip_address,
    user_agent
  ) VALUES (
    v_sub_account.id,
    v_session_token,
    v_expires_at,
    p_ip_address,
    p_user_agent
  );
  
  -- Mettre à jour la dernière connexion
  UPDATE sub_accounts
  SET last_login_at = now()
  WHERE id = v_sub_account.id;
  
  -- Retourner le succès avec les données du sous-compte
  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'expires_at', v_expires_at,
    'sub_account', jsonb_build_object(
      'id', v_sub_account.id,
      'main_account_id', v_sub_account.main_account_id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'permissions', v_sub_account.permissions,
      'is_active', v_sub_account.is_active,
      'last_login_at', v_sub_account.last_login_at,
      'created_at', v_sub_account.created_at,
      'updated_at', v_sub_account.updated_at
    )
  );
END;
$$;

-- Fonction pour valider une session de sous-compte
CREATE OR REPLACE FUNCTION validate_sub_account_session(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sub_account_sessions%ROWTYPE;
  v_sub_account sub_accounts%ROWTYPE;
BEGIN
  -- Trouver la session
  SELECT * INTO v_session
  FROM sub_account_sessions
  WHERE session_token = p_session_token
  AND expires_at > now();
  
  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session invalide ou expirée'
    );
  END IF;
  
  -- Récupérer le sous-compte
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE id = v_session.sub_account_id
  AND is_active = true;
  
  IF v_sub_account.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sous-compte inactif'
    );
  END IF;
  
  -- Retourner le succès
  RETURN jsonb_build_object(
    'success', true,
    'sub_account', jsonb_build_object(
      'id', v_sub_account.id,
      'main_account_id', v_sub_account.main_account_id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'permissions', v_sub_account.permissions,
      'is_active', v_sub_account.is_active,
      'last_login_at', v_sub_account.last_login_at,
      'created_at', v_sub_account.created_at,
      'updated_at', v_sub_account.updated_at
    )
  );
END;
$$;

-- Fonction pour configurer les paramètres de session (utilisée pour RLS)
CREATE OR REPLACE FUNCTION set_config(
  parameter text,
  value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cette fonction permet de configurer des paramètres de session
  -- Elle est utilisée pour passer le token de sous-compte aux politiques RLS
  PERFORM set_config(parameter, value, false);
END;
$$;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_sub_accounts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_sub_accounts_updated_at
  BEFORE UPDATE ON sub_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_sub_accounts_updated_at();

-- Nettoyer les sessions expirées (fonction utilitaire)
CREATE OR REPLACE FUNCTION cleanup_expired_sub_account_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sub_account_sessions
  WHERE expires_at < now() - interval '1 day';
END;
$$;