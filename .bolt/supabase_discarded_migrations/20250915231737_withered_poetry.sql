/*
  # Système de sous-comptes

  1. Nouvelles tables
    - `sub_accounts` - Comptes secondaires liés à un compte principal
    - `sub_account_sessions` - Sessions des sous-comptes pour l'authentification

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour l'accès des comptes principaux et sous-comptes
    - Contraintes d'intégrité

  3. Fonctionnalités
    - Création rapide de sous-comptes
    - Authentification simplifiée pour sous-comptes
    - Accès restreint au stockage PDF du compte principal
*/

-- Table des sous-comptes
CREATE TABLE IF NOT EXISTS sub_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{"pdf_access": true, "download_only": true}'::jsonb,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT sub_accounts_username_main_account_unique UNIQUE (main_account_id, username),
  CONSTRAINT sub_accounts_username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,20}$')
);

-- Table des sessions des sous-comptes
CREATE TABLE IF NOT EXISTS sub_account_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT sub_account_sessions_expires_future CHECK (expires_at > now())
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account ON sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON sub_accounts(username);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_active ON sub_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON sub_account_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_sub_account ON sub_account_sessions(sub_account_id);

-- Activer RLS
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques pour sub_accounts
CREATE POLICY "Main accounts can manage their sub accounts"
  ON sub_accounts
  FOR ALL
  TO authenticated
  USING (main_account_id = auth.uid())
  WITH CHECK (main_account_id = auth.uid());

CREATE POLICY "Sub accounts can read their own data"
  ON sub_accounts
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT sub_account_id 
    FROM sub_account_sessions 
    WHERE session_token = current_setting('app.sub_account_token', true)
    AND expires_at > now()
  ));

-- Politiques pour sub_account_sessions
CREATE POLICY "Main accounts can view sessions of their sub accounts"
  ON sub_account_sessions
  FOR SELECT
  TO authenticated
  USING (sub_account_id IN (
    SELECT id 
    FROM sub_accounts 
    WHERE main_account_id = auth.uid()
  ));

CREATE POLICY "System can manage sub account sessions"
  ON sub_account_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction pour créer un sous-compte
CREATE OR REPLACE FUNCTION create_sub_account(
  p_username text,
  p_display_name text,
  p_password text,
  p_permissions jsonb DEFAULT '{"pdf_access": true, "download_only": true}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_main_account_id uuid;
  v_password_hash text;
  v_sub_account_id uuid;
  v_result json;
BEGIN
  -- Vérifier que l'utilisateur est connecté
  v_main_account_id := auth.uid();
  IF v_main_account_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Valider les paramètres
  IF LENGTH(p_username) < 3 OR LENGTH(p_username) > 20 THEN
    RETURN json_build_object('success', false, 'error', 'Le nom d''utilisateur doit contenir entre 3 et 20 caractères');
  END IF;

  IF LENGTH(p_display_name) < 2 OR LENGTH(p_display_name) > 50 THEN
    RETURN json_build_object('success', false, 'error', 'Le nom d''affichage doit contenir entre 2 et 50 caractères');
  END IF;

  IF LENGTH(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Le mot de passe doit contenir au moins 6 caractères');
  END IF;

  -- Vérifier que le nom d'utilisateur n'existe pas déjà pour ce compte principal
  IF EXISTS (
    SELECT 1 FROM sub_accounts 
    WHERE main_account_id = v_main_account_id 
    AND username = p_username
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Ce nom d''utilisateur existe déjà');
  END IF;

  -- Hasher le mot de passe (simple pour la démo, en production utiliser bcrypt)
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');

  -- Créer le sous-compte
  INSERT INTO sub_accounts (
    main_account_id,
    username,
    display_name,
    password_hash,
    permissions
  ) VALUES (
    v_main_account_id,
    p_username,
    p_display_name,
    v_password_hash,
    p_permissions
  ) RETURNING id INTO v_sub_account_id;

  -- Retourner le résultat
  v_result := json_build_object(
    'success', true,
    'sub_account_id', v_sub_account_id,
    'username', p_username,
    'display_name', p_display_name
  );

  RETURN v_result;
END;
$$;

-- Fonction pour authentifier un sous-compte
CREATE OR REPLACE FUNCTION authenticate_sub_account(
  p_main_account_email text,
  p_username text,
  p_password text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_main_account_id uuid;
  v_sub_account sub_accounts%ROWTYPE;
  v_password_hash text;
  v_session_token text;
  v_expires_at timestamptz;
  v_result json;
BEGIN
  -- Trouver le compte principal par email
  SELECT id INTO v_main_account_id
  FROM auth.users
  WHERE email = p_main_account_email;

  IF v_main_account_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Compte principal non trouvé');
  END IF;

  -- Trouver le sous-compte
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE main_account_id = v_main_account_id
  AND username = p_username
  AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sous-compte non trouvé ou inactif');
  END IF;

  -- Vérifier le mot de passe
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');
  
  IF v_sub_account.password_hash != v_password_hash THEN
    RETURN json_build_object('success', false, 'error', 'Mot de passe incorrect');
  END IF;

  -- Générer un token de session (24h)
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '24 hours';

  -- Nettoyer les anciennes sessions expirées
  DELETE FROM sub_account_sessions 
  WHERE sub_account_id = v_sub_account.id 
  AND expires_at < now();

  -- Créer la nouvelle session
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

  -- Retourner les données de session
  v_result := json_build_object(
    'success', true,
    'session_token', v_session_token,
    'expires_at', v_expires_at,
    'sub_account', json_build_object(
      'id', v_sub_account.id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'permissions', v_sub_account.permissions,
      'main_account_id', v_sub_account.main_account_id
    )
  );

  RETURN v_result;
END;
$$;

-- Fonction pour valider une session de sous-compte
CREATE OR REPLACE FUNCTION validate_sub_account_session(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sub_account_sessions%ROWTYPE;
  v_sub_account sub_accounts%ROWTYPE;
  v_result json;
BEGIN
  -- Trouver la session
  SELECT * INTO v_session
  FROM sub_account_sessions
  WHERE session_token = p_session_token
  AND expires_at > now();

  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Session invalide ou expirée');
  END IF;

  -- Récupérer les données du sous-compte
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE id = v_session.sub_account_id
  AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sous-compte inactif');
  END IF;

  -- Retourner les données
  v_result := json_build_object(
    'success', true,
    'sub_account', json_build_object(
      'id', v_sub_account.id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'permissions', v_sub_account.permissions,
      'main_account_id', v_sub_account.main_account_id
    ),
    'session', json_build_object(
      'expires_at', v_session.expires_at
    )
  );

  RETURN v_result;
END;
$$;

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sub_account_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sub_account_sessions WHERE expires_at < now();
END;
$$;

-- Politique pour permettre l'accès aux PDFs du compte principal depuis les sous-comptes
CREATE POLICY "Sub accounts can access main account PDFs"
  ON pdf_storage
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT sa.main_account_id
      FROM sub_accounts sa
      JOIN sub_account_sessions sas ON sas.sub_account_id = sa.id
      WHERE sas.session_token = current_setting('app.sub_account_token', true)
      AND sas.expires_at > now()
      AND sa.is_active = true
      AND (sa.permissions->>'pdf_access')::boolean = true
    )
  );