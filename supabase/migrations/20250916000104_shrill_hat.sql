/*
  # Système de sous-comptes SignFast

  1. Nouvelles tables
    - `sub_accounts` : Comptes d'accès restreint
      - `id` (uuid, clé primaire)
      - `main_account_id` (uuid, référence vers auth.users)
      - `username` (text, unique par compte principal)
      - `display_name` (text, nom d'affichage)
      - `password_hash` (text, mot de passe hashé)
      - `is_active` (boolean, statut du compte)
      - `permissions` (jsonb, permissions accordées)
      - `last_login_at` (timestamp, dernière connexion)
      - `created_at` et `updated_at` (timestamps)
    
    - `sub_account_sessions` : Sessions des sous-comptes
      - `id` (uuid, clé primaire)
      - `sub_account_id` (uuid, référence vers sub_accounts)
      - `session_token` (text, token de session unique)
      - `expires_at` (timestamp, expiration)
      - `ip_address` et `user_agent` (text, métadonnées)
      - `created_at` (timestamp)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour l'accès aux données
    - Contraintes d'unicité et clés étrangères

  3. Fonctions
    - `create_sub_account()` : Création de sous-comptes
    - `authenticate_sub_account()` : Authentification
    - `validate_sub_account_session()` : Validation de session
    - `cleanup_expired_sub_account_sessions()` : Nettoyage automatique

  4. Performance
    - Index sur les champs fréquemment utilisés
    - Optimisation des requêtes
*/

-- Créer la table des sous-comptes
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
  
  -- Contrainte d'unicité : username unique par compte principal
  UNIQUE(main_account_id, username)
);

-- Créer la table des sessions de sous-comptes
CREATE TABLE IF NOT EXISTS sub_account_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS sur les tables
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour sub_accounts
CREATE POLICY "Utilisateurs peuvent gérer leurs sous-comptes"
  ON sub_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = main_account_id)
  WITH CHECK (auth.uid() = main_account_id);

CREATE POLICY "Super admins peuvent gérer tous les sous-comptes"
  ON sub_accounts
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

-- Politiques RLS pour sub_account_sessions
CREATE POLICY "Sessions accessibles par le propriétaire du sous-compte"
  ON sub_account_sessions
  FOR ALL
  TO authenticated
  USING (
    sub_account_id IN (
      SELECT id FROM sub_accounts WHERE main_account_id = auth.uid()
    )
  )
  WITH CHECK (
    sub_account_id IN (
      SELECT id FROM sub_accounts WHERE main_account_id = auth.uid()
    )
  );

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account_id ON sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON sub_accounts(main_account_id, username);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_active ON sub_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON sub_account_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_sub_account ON sub_account_sessions(sub_account_id);

-- Fonction pour créer un sous-compte
CREATE OR REPLACE FUNCTION create_sub_account(
  p_username text,
  p_display_name text,
  p_password_hash text,
  p_permissions jsonb DEFAULT '{"pdf_access": true, "download_only": true}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_main_account_id uuid;
  v_sub_account_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  v_main_account_id := auth.uid();
  
  IF v_main_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Utilisateur non authentifié'
    );
  END IF;

  -- Vérifier que le nom d'utilisateur est valide
  IF p_username IS NULL OR length(trim(p_username)) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le nom d''utilisateur doit contenir au moins 3 caractères'
    );
  END IF;

  -- Vérifier l'unicité du nom d'utilisateur pour ce compte principal
  IF EXISTS (
    SELECT 1 FROM sub_accounts 
    WHERE main_account_id = v_main_account_id 
    AND username = p_username
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce nom d''utilisateur existe déjà pour votre compte'
    );
  END IF;

  -- Créer le sous-compte
  INSERT INTO sub_accounts (
    main_account_id,
    username,
    display_name,
    password_hash,
    permissions,
    is_active
  ) VALUES (
    v_main_account_id,
    p_username,
    p_display_name,
    p_password_hash,
    p_permissions,
    true
  ) RETURNING id INTO v_sub_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'sub_account_id', v_sub_account_id,
    'message', 'Sous-compte créé avec succès'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce nom d''utilisateur existe déjà'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur lors de la création du sous-compte'
    );
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_main_account_id uuid;
  v_sub_account sub_accounts%ROWTYPE;
  v_session_token text;
  v_password_hash text;
BEGIN
  -- Trouver l'ID du compte principal par email
  SELECT id INTO v_main_account_id
  FROM auth.users
  WHERE email = p_main_account_email;

  IF v_main_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Compte principal non trouvé'
    );
  END IF;

  -- Hasher le mot de passe fourni avec le même algorithme
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');

  -- Trouver le sous-compte
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE main_account_id = v_main_account_id
    AND username = p_username
    AND password_hash = v_password_hash
    AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Identifiants incorrects'
    );
  END IF;

  -- Générer un token de session unique
  v_session_token := encode(gen_random_bytes(32), 'base64');

  -- Nettoyer les anciennes sessions expirées
  DELETE FROM sub_account_sessions 
  WHERE sub_account_id = v_sub_account.id 
    AND expires_at < now();

  -- Créer une nouvelle session
  INSERT INTO sub_account_sessions (
    sub_account_id,
    session_token,
    expires_at,
    ip_address,
    user_agent
  ) VALUES (
    v_sub_account.id,
    v_session_token,
    now() + interval '24 hours',
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
    'sub_account', jsonb_build_object(
      'id', v_sub_account.id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'main_account_id', v_sub_account.main_account_id,
      'permissions', v_sub_account.permissions,
      'is_active', v_sub_account.is_active
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur lors de l''authentification'
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

  -- Récupérer les données du sous-compte
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

  RETURN jsonb_build_object(
    'success', true,
    'sub_account', jsonb_build_object(
      'id', v_sub_account.id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'main_account_id', v_sub_account.main_account_id,
      'permissions', v_sub_account.permissions,
      'is_active', v_sub_account.is_active
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur lors de la validation'
    );
END;
$$;

-- Fonction de nettoyage des sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sub_account_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sub_account_sessions 
  WHERE expires_at < now();
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

-- Politique RLS pour l'accès aux PDFs via sous-comptes
DO $$
BEGIN
  -- Vérifier si la politique existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pdf_storage' 
    AND policyname = 'Sous-comptes peuvent accéder aux PDFs du compte principal'
  ) THEN
    CREATE POLICY "Sous-comptes peuvent accéder aux PDFs du compte principal"
      ON pdf_storage
      FOR SELECT
      TO public
      USING (
        -- Vérifier si l'utilisateur a un token de sous-compte valide
        EXISTS (
          SELECT 1 
          FROM sub_account_sessions sas
          JOIN sub_accounts sa ON sa.id = sas.sub_account_id
          WHERE sas.session_token = current_setting('app.sub_account_token', true)
            AND sas.expires_at > now()
            AND sa.is_active = true
            AND sa.main_account_id = pdf_storage.user_id
            AND (sa.permissions->>'pdf_access')::boolean = true
        )
      );
  END IF;
END $$;

-- Fonction pour définir la configuration de session
CREATE OR REPLACE FUNCTION set_config(parameter text, value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(parameter, value, false);
END;
$$;