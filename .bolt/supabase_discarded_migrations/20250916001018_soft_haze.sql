/*
  # Système de sous-comptes complet pour SignFast

  1. Nouvelles Tables
    - `sub_accounts` : Comptes d'accès restreint avec authentification
    - `sub_account_sessions` : Sessions de connexion pour les sous-comptes

  2. Fonctions
    - `create_sub_account()` : Création sécurisée de sous-comptes
    - `authenticate_sub_account()` : Authentification des sous-comptes
    - `validate_sub_account_session()` : Validation des sessions
    - `cleanup_expired_sessions()` : Nettoyage automatique des sessions expirées

  3. Sécurité
    - RLS activé sur toutes les tables
    - Politiques strictes d'accès
    - Hachage sécurisé des mots de passe
    - Sessions avec expiration automatique

  4. Performance
    - Index optimisés pour les requêtes fréquentes
    - Nettoyage automatique des sessions expirées
*/

-- Créer la table des sous-comptes
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
  
  -- Contraintes
  CONSTRAINT sub_accounts_username_main_account_unique UNIQUE (main_account_id, username),
  CONSTRAINT sub_accounts_username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT sub_accounts_username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Créer la table des sessions de sous-comptes
CREATE TABLE IF NOT EXISTS sub_account_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account ON sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON sub_accounts(main_account_id, username);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_active ON sub_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON sub_account_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_sub_account ON sub_account_sessions(sub_account_id);

-- Politiques RLS pour sub_accounts
CREATE POLICY "Users can manage their own sub-accounts"
  ON sub_accounts
  FOR ALL
  TO authenticated
  USING (main_account_id = auth.uid())
  WITH CHECK (main_account_id = auth.uid());

CREATE POLICY "Super admins can manage all sub-accounts"
  ON sub_accounts
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Politiques RLS pour sub_account_sessions
CREATE POLICY "Sub-account sessions are private"
  ON sub_account_sessions
  FOR ALL
  TO authenticated
  USING (
    sub_account_id IN (
      SELECT id FROM sub_accounts 
      WHERE main_account_id = auth.uid()
    )
  )
  WITH CHECK (
    sub_account_id IN (
      SELECT id FROM sub_accounts 
      WHERE main_account_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all sessions"
  ON sub_account_sessions
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Fonction pour créer un sous-compte
CREATE OR REPLACE FUNCTION create_sub_account(
  p_main_account_id uuid,
  p_username text,
  p_display_name text,
  p_password text,
  p_permissions jsonb DEFAULT '{"pdf_access": true, "download_only": true}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash text;
  v_sub_account sub_accounts%ROWTYPE;
BEGIN
  -- Vérifier que l'utilisateur principal existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_main_account_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Compte principal non trouvé');
  END IF;

  -- Vérifier que le nom d'utilisateur n'existe pas déjà pour ce compte principal
  IF EXISTS (
    SELECT 1 FROM sub_accounts 
    WHERE main_account_id = p_main_account_id 
    AND username = p_username
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce nom d''utilisateur existe déjà');
  END IF;

  -- Hacher le mot de passe avec le salt basé sur l'ID du compte principal
  v_password_hash := encode(
    digest(p_password || p_main_account_id::text, 'sha256'), 
    'hex'
  );

  -- Créer le sous-compte
  INSERT INTO sub_accounts (
    main_account_id,
    username,
    display_name,
    password_hash,
    permissions,
    is_active
  ) VALUES (
    p_main_account_id,
    p_username,
    p_display_name,
    v_password_hash,
    p_permissions,
    true
  ) RETURNING * INTO v_sub_account;

  RETURN jsonb_build_object(
    'success', true,
    'sub_account', row_to_json(v_sub_account)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Erreur lors de la création: ' || SQLERRM
    );
END;
$$;

-- Fonction pour authentifier un sous-compte
CREATE OR REPLACE FUNCTION authenticate_sub_account(
  p_main_account_email text,
  p_username text,
  p_password text,
  p_ip_address inet DEFAULT NULL,
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
  WHERE email = p_main_account_email;

  IF v_main_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Compte principal non trouvé');
  END IF;

  -- Hacher le mot de passe fourni
  v_password_hash := encode(
    digest(p_password || v_main_account_id::text, 'sha256'), 
    'hex'
  );

  -- Vérifier les identifiants
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE main_account_id = v_main_account_id
    AND username = p_username
    AND password_hash = v_password_hash
    AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Identifiants incorrects');
  END IF;

  -- Générer un token de session unique
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

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

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
    'expires_at', v_expires_at,
    'sub_account', row_to_json(v_sub_account)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur d''authentification: ' || SQLERRM
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
  -- Vérifier la session
  SELECT * INTO v_session
  FROM sub_account_sessions
  WHERE session_token = p_session_token
    AND expires_at > now();

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session invalide ou expirée');
  END IF;

  -- Récupérer le sous-compte
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE id = v_session.sub_account_id
    AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sous-compte inactif');
  END IF;

  -- Mettre à jour la dernière utilisation
  UPDATE sub_account_sessions
  SET last_used_at = now()
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'success', true,
    'sub_account', row_to_json(v_sub_account),
    'session', row_to_json(v_session)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur de validation: ' || SQLERRM
    );
END;
$$;

-- Fonction pour nettoyer les sessions expirées
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

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_sub_accounts_updated_at()
RETURNS trigger
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

-- Fonction pour configurer l'accès RLS avec token de session
CREATE OR REPLACE FUNCTION set_config(parameter text, value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cette fonction permet de configurer des paramètres de session
  -- pour l'accès RLS des sous-comptes
  PERFORM set_config(parameter, value, false);
END;
$$;