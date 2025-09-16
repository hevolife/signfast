/*
  # Sub-Accounts System Migration

  1. New Tables
    - `sub_accounts`
      - `id` (uuid, primary key)
      - `main_account_id` (uuid, foreign key to auth.users)
      - `username` (text, unique within main account)
      - `display_name` (text)
      - `password_hash` (text)
      - `is_active` (boolean, default true)
      - `permissions` (jsonb, default permissions)
      - `last_login_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `sub_account_sessions`
      - `id` (uuid, primary key)
      - `sub_account_id` (uuid, foreign key)
      - `session_token` (text, unique)
      - `expires_at` (timestamp)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for main account owners to manage their sub-accounts
    - Add policies for sub-accounts to access their own data

  3. Functions
    - `create_sub_account()` - Creates a new sub-account
    - `authenticate_sub_account()` - Authenticates a sub-account login
    - `validate_sub_account_session()` - Validates session tokens
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
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sub_accounts
CREATE POLICY "Main account owners can manage their sub-accounts"
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

-- RLS Policies for sub_account_sessions
CREATE POLICY "Main account owners can view sessions of their sub-accounts"
  ON sub_account_sessions
  FOR SELECT
  TO authenticated
  USING (
    sub_account_id IN (
      SELECT id FROM sub_accounts WHERE main_account_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all sessions"
  ON sub_account_sessions
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account_id ON sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON sub_accounts(main_account_id, username);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_active ON sub_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON sub_account_sessions(expires_at);

-- Function to create a sub-account
CREATE OR REPLACE FUNCTION create_sub_account(
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
  v_main_account_id uuid;
  v_password_hash text;
  v_sub_account_id uuid;
BEGIN
  -- Get the current user ID
  v_main_account_id := auth.uid();
  
  IF v_main_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if username already exists for this main account
  IF EXISTS (
    SELECT 1 FROM sub_accounts 
    WHERE main_account_id = v_main_account_id AND username = p_username
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username already exists');
  END IF;

  -- Hash the password (simple hash with main account ID as salt)
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');

  -- Insert the new sub-account
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

  RETURN jsonb_build_object(
    'success', true,
    'sub_account_id', v_sub_account_id
  );
END;
$$;

-- Function to authenticate a sub-account
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
  v_session_id uuid;
BEGIN
  -- Get main account ID from email
  SELECT id INTO v_main_account_id
  FROM auth.users
  WHERE email = p_main_account_email;

  IF v_main_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Main account not found');
  END IF;

  -- Get sub-account
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE main_account_id = v_main_account_id 
    AND username = p_username
    AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sub-account not found or inactive');
  END IF;

  -- Verify password
  v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');
  
  IF v_sub_account.password_hash != v_password_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
  END IF;

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- Create session
  INSERT INTO sub_account_sessions (
    sub_account_id,
    session_token,
    ip_address,
    user_agent
  ) VALUES (
    v_sub_account.id,
    v_session_token,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_session_id;

  -- Update last login
  UPDATE sub_accounts 
  SET last_login_at = now()
  WHERE id = v_sub_account.id;

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_token,
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

-- Function to validate a sub-account session
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
  -- Get session
  SELECT * INTO v_session
  FROM sub_account_sessions
  WHERE session_token = p_session_token
    AND expires_at > now();

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session');
  END IF;

  -- Get sub-account
  SELECT * INTO v_sub_account
  FROM sub_accounts
  WHERE id = v_session.sub_account_id
    AND is_active = true;

  IF v_sub_account.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sub-account not found or inactive');
  END IF;

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

-- Function to clean up expired sessions
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