/*
  # Create sub-accounts system

  1. New Tables
    - `sub_accounts`
      - `id` (uuid, primary key)
      - `main_account_id` (uuid, references auth.users)
      - `username` (text, unique)
      - `display_name` (text)
      - `password_hash` (text)
      - `is_active` (boolean, default true)
      - `permissions` (jsonb, default permissions)
      - `last_login_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `sub_account_sessions`
      - `id` (uuid, primary key)
      - `sub_account_id` (uuid, references sub_accounts)
      - `session_token` (text, unique)
      - `expires_at` (timestamp)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for main account access
    - Add policies for sub-account access

  3. Functions
    - `create_sub_account` - Create new sub-account
    - `authenticate_sub_account` - Login sub-account
    - `validate_sub_account_session` - Validate session
*/

-- Create sub_accounts table
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
  UNIQUE(main_account_id, username)
);

-- Create sub_account_sessions table
CREATE TABLE IF NOT EXISTS sub_account_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_account_id uuid NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account_id ON sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON sub_accounts(username);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON sub_account_sessions(expires_at);

-- RLS Policies for sub_accounts
CREATE POLICY "Main accounts can manage their sub-accounts"
  ON sub_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = main_account_id)
  WITH CHECK (auth.uid() = main_account_id);

-- RLS Policies for sub_account_sessions
CREATE POLICY "Sub-accounts can access their own sessions"
  ON sub_account_sessions
  FOR ALL
  TO authenticated
  USING (
    sub_account_id IN (
      SELECT id FROM sub_accounts WHERE main_account_id = auth.uid()
    )
  );

-- Function to create sub-account
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
BEGIN
  -- Get current user ID
  v_main_account_id := auth.uid();
  
  IF v_main_account_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Check if username already exists for this main account
  IF EXISTS (
    SELECT 1 FROM sub_accounts 
    WHERE main_account_id = v_main_account_id AND username = p_username
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Ce nom d''utilisateur existe déjà');
  END IF;

  -- Hash password (simple hash for demo - use proper hashing in production)
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');

  -- Insert sub-account
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

  RETURN json_build_object(
    'success', true,
    'sub_account_id', v_sub_account_id
  );
END;
$$;

-- Function to authenticate sub-account
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
BEGIN
  -- Find main account by email
  SELECT id INTO v_main_account_id
  FROM auth.users
  WHERE email = p_main_account_email;

  IF v_main_account_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Compte principal non trouvé');
  END IF;

  -- Find sub-account
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE main_account_id = v_main_account_id 
    AND username = p_username
    AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sous-compte non trouvé ou inactif');
  END IF;

  -- Verify password
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');
  
  IF v_sub_account.password_hash != v_password_hash THEN
    RETURN json_build_object('success', false, 'error', 'Mot de passe incorrect');
  END IF;

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '24 hours';

  -- Clean old sessions
  DELETE FROM sub_account_sessions 
  WHERE sub_account_id = v_sub_account.id 
    AND expires_at < now();

  -- Create new session
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

  -- Update last login
  UPDATE sub_accounts 
  SET last_login_at = now()
  WHERE id = v_sub_account.id;

  RETURN json_build_object(
    'success', true,
    'session_token', v_session_token,
    'sub_account', json_build_object(
      'id', v_sub_account.id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'main_account_id', v_sub_account.main_account_id,
      'permissions', v_sub_account.permissions,
      'is_active', v_sub_account.is_active
    )
  );
END;
$$;

-- Function to validate sub-account session
CREATE OR REPLACE FUNCTION validate_sub_account_session(
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sub_account_sessions%ROWTYPE;
  v_sub_account sub_accounts%ROWTYPE;
BEGIN
  -- Find session
  SELECT * INTO v_session
  FROM sub_account_sessions
  WHERE session_token = p_session_token
    AND expires_at > now();

  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Session invalide ou expirée');
  END IF;

  -- Get sub-account
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE id = v_session.sub_account_id
    AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sous-compte inactif');
  END IF;

  RETURN json_build_object(
    'success', true,
    'sub_account', json_build_object(
      'id', v_sub_account.id,
      'username', v_sub_account.username,
      'display_name', v_sub_account.display_name,
      'main_account_id', v_sub_account.main_account_id,
      'permissions', v_sub_account.permissions,
      'is_active', v_sub_account.is_active
    )
  );
END;
$$;