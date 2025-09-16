/*
  # Create sub_accounts table

  1. New Tables
    - `sub_accounts`
      - `id` (uuid, primary key)
      - `main_account_id` (uuid, foreign key to auth.users)
      - `username` (text, unique)
      - `display_name` (text)
      - `password_hash` (text)
      - `is_active` (boolean, default true)
      - `permissions` (jsonb, default permissions object)
      - `last_login_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `sub_accounts` table
    - Add policy for main accounts to manage their sub-accounts
    - Add policy for sub-accounts to view their own data

  3. Functions
    - Add RPC functions for sub-account authentication and session management
*/

-- Create the sub_accounts table
CREATE TABLE IF NOT EXISTS public.sub_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    main_account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE,
    display_name text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    permissions jsonb DEFAULT '{"pdf_access": true, "download_only": true}'::jsonb NOT NULL,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.sub_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Main accounts can manage their sub_accounts" 
ON public.sub_accounts
FOR ALL 
USING (main_account_id = auth.uid()) 
WITH CHECK (main_account_id = auth.uid());

CREATE POLICY "Sub_accounts can view their own data" 
ON public.sub_accounts
FOR SELECT 
USING (id = (current_setting('app.sub_account_id', true)::uuid));

-- Create sub_account_sessions table for session management
CREATE TABLE IF NOT EXISTS public.sub_account_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_account_id uuid NOT NULL REFERENCES public.sub_accounts(id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS for sessions table
ALTER TABLE public.sub_account_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for sessions
CREATE POLICY "Sub_account sessions access" 
ON public.sub_account_sessions
FOR ALL 
USING (sub_account_id IN (
    SELECT id FROM public.sub_accounts 
    WHERE main_account_id = auth.uid()
));

-- Create function to authenticate sub-account
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
    v_main_user_id uuid;
    v_sub_account sub_accounts%ROWTYPE;
    v_session_token text;
    v_expires_at timestamptz;
    v_password_hash text;
BEGIN
    -- Find main account by email
    SELECT id INTO v_main_user_id
    FROM auth.users
    WHERE email = p_main_account_email;
    
    IF v_main_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Main account not found');
    END IF;
    
    -- Hash the provided password with main account ID as salt
    v_password_hash := encode(digest(p_password || v_main_user_id::text, 'sha256'), 'hex');
    
    -- Find and validate sub-account
    SELECT * INTO v_sub_account
    FROM sub_accounts
    WHERE main_account_id = v_main_user_id
    AND username = p_username
    AND password_hash = v_password_hash
    AND is_active = true;
    
    IF v_sub_account.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
    END IF;
    
    -- Generate session token
    v_session_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := now() + interval '24 hours';
    
    -- Create session
    INSERT INTO sub_account_sessions (sub_account_id, session_token, expires_at, ip_address, user_agent)
    VALUES (v_sub_account.id, v_session_token, v_expires_at, p_ip_address, p_user_agent);
    
    -- Update last login
    UPDATE sub_accounts 
    SET last_login_at = now(), updated_at = now()
    WHERE id = v_sub_account.id;
    
    -- Return success with session data
    RETURN jsonb_build_object(
        'success', true,
        'session_token', v_session_token,
        'sub_account', row_to_json(v_sub_account)
    );
END;
$$;

-- Create function to validate sub-account session
CREATE OR REPLACE FUNCTION validate_sub_account_session(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session sub_account_sessions%ROWTYPE;
    v_sub_account sub_accounts%ROWTYPE;
BEGIN
    -- Find active session
    SELECT * INTO v_session
    FROM sub_account_sessions
    WHERE session_token = p_session_token
    AND expires_at > now();
    
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session');
    END IF;
    
    -- Get sub-account data
    SELECT * INTO v_sub_account
    FROM sub_accounts
    WHERE id = v_session.sub_account_id
    AND is_active = true;
    
    IF v_sub_account.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sub-account not found or inactive');
    END IF;
    
    -- Return success with sub-account data
    RETURN jsonb_build_object(
        'success', true,
        'sub_account', row_to_json(v_sub_account)
    );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_accounts_main_account_id ON public.sub_accounts(main_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_username ON public.sub_accounts(username);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_token ON public.sub_account_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sub_account_sessions_expires ON public.sub_account_sessions(expires_at);