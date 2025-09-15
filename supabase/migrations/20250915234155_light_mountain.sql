/*
  # Create Sub-Accounts System

  1. New Tables
    - `sub_accounts`
      - `id` (uuid, primary key)
      - `main_account_id` (uuid, references auth.users)
      - `username` (text, unique)
      - `display_name` (text)
      - `password_hash` (text)
      - `is_active` (boolean, default true)
      - `permissions` (jsonb, default pdf access)
      - `last_login_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sub_account_sessions`
      - `id` (uuid, primary key)
      - `sub_account_id` (uuid, references sub_accounts)
      - `session_token` (text, unique)
      - `expires_at` (timestamptz)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for main account management
    - Add policies for sub-account access

  3. Functions
    - `create_sub_account` - Creates new sub-accounts
    - `authenticate_sub_account` - Handles sub-account login
    - `validate_sub_account_session` - Validates session tokens
*/

-- Create sub_accounts table
CREATE TABLE IF NOT EXISTS public.sub_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    main_account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE,
    display_name text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT TRUE NOT NULL,
    permissions jsonb DEFAULT '{"pdf_access": true, "download_only": true}'::jsonb NOT NULL,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create sub_account_sessions table
CREATE TABLE IF NOT EXISTS public.sub_account_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for sub_accounts
CREATE POLICY "Allow main account to manage their sub_accounts" ON public.sub_accounts
    FOR ALL USING (main_account_id = auth.uid());

CREATE POLICY "Allow sub_account to read their own data" ON public.sub_accounts
    FOR SELECT USING (id = (
        SELECT sub_account_id 
        FROM public.sub_account_sessions 
        WHERE session_token = current_setting('app.sub_account_token', true)::text 
        AND expires_at > now()
    ));

-- Policies for sub_account_sessions
CREATE POLICY "Allow sub_account to manage their own sessions" ON public.sub_account_sessions
    FOR ALL USING (sub_account_id = (
        SELECT sub_account_id 
        FROM public.sub_account_sessions 
        WHERE session_token = current_setting('app.sub_account_token', true)::text 
        AND expires_at > now()
    ));

CREATE POLICY "Allow main account to read sub_account sessions" ON public.sub_account_sessions
    FOR SELECT USING (sub_account_id IN (
        SELECT id 
        FROM public.sub_accounts 
        WHERE main_account_id = auth.uid()
    ));

-- Function to create sub-accounts
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
    
    -- Check if username already exists
    IF EXISTS (SELECT 1 FROM public.sub_accounts WHERE username = p_username) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username already exists');
    END IF;
    
    -- Hash the password (simple hash with main account ID as salt)
    v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');
    
    -- Create the sub-account
    INSERT INTO public.sub_accounts (
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

-- Function to authenticate sub-accounts
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
    -- Find the main account by email
    SELECT id INTO v_main_account_id
    FROM auth.users
    WHERE email = p_main_account_email;
    
    IF v_main_account_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Main account not found');
    END IF;
    
    -- Find the sub-account
    SELECT * INTO v_sub_account
    FROM public.sub_accounts
    WHERE username = p_username AND main_account_id = v_main_account_id;
    
    IF v_sub_account.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sub-account not found');
    END IF;
    
    IF NOT v_sub_account.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sub-account is disabled');
    END IF;
    
    -- Verify password
    v_password_hash := encode(digest(p_password || v_main_account_id::text, 'sha256'), 'hex');
    
    IF v_sub_account.password_hash != v_password_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
    END IF;
    
    -- Generate session token
    v_session_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := now() + interval '24 hours';
    
    -- Create session
    INSERT INTO public.sub_account_sessions (
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
    UPDATE public.sub_accounts
    SET last_login_at = now()
    WHERE id = v_sub_account.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'session_token', v_session_token,
        'sub_account', jsonb_build_object(
            'id', v_sub_account.id,
            'username', v_sub_account.username,
            'display_name', v_sub_account.display_name,
            'permissions', v_sub_account.permissions,
            'main_account_id', v_sub_account.main_account_id
        )
    );
END;
$$;

-- Function to validate sub-account sessions
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
    -- Find the session
    SELECT * INTO v_session
    FROM public.sub_account_sessions
    WHERE session_token = p_session_token AND expires_at > now();
    
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session');
    END IF;
    
    -- Get the sub-account
    SELECT * INTO v_sub_account
    FROM public.sub_accounts
    WHERE id = v_session.sub_account_id;
    
    IF NOT v_sub_account.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sub-account is disabled');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'sub_account', jsonb_build_object(
            'id', v_sub_account.id,
            'username', v_sub_account.username,
            'display_name', v_sub_account.display_name,
            'permissions', v_sub_account.permissions,
            'main_account_id', v_sub_account.main_account_id
        )
    );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account_id ON public.sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON public.sub_accounts(username);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON public.sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON public.sub_account_sessions(expires_at);