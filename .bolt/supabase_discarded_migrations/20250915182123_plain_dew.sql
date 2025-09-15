/*
  # Create secret codes system

  1. New Tables
    - `secret_codes` - Available secret codes
    - `user_secret_codes` - User activated codes
  
  2. Enums
    - `secret_code_type` - Code types (monthly, lifetime)
  
  3. Security
    - Enable RLS on both tables
    - Public can check code existence
    - Users can activate codes
  
  4. Functions
    - Code activation logic
*/

-- Create enum for secret code types
CREATE TYPE IF NOT EXISTS secret_code_type AS ENUM ('monthly', 'lifetime');

-- Create secret_codes table
CREATE TABLE IF NOT EXISTS secret_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type secret_code_type NOT NULL,
  description text DEFAULT ''::text,
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_secret_codes table
CREATE TABLE IF NOT EXISTS user_secret_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_id uuid NOT NULL,
  activated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (code_id) REFERENCES secret_codes(id) ON DELETE CASCADE,
  CONSTRAINT user_secret_codes_user_id_code_id_key UNIQUE (user_id, code_id)
);

-- Enable RLS
ALTER TABLE secret_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secret_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secret_codes
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
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  );

-- RLS Policies for user_secret_codes
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

-- Create function to activate secret code
CREATE OR REPLACE FUNCTION activate_secret_code(code_input text, user_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_code_record secret_codes%ROWTYPE;
  user_code_record user_secret_codes%ROWTYPE;
  expires_at_value timestamptz;
BEGIN
  -- Find the secret code
  SELECT * INTO secret_code_record
  FROM secret_codes
  WHERE code = UPPER(code_input) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code secret invalide ou expiré');
  END IF;
  
  -- Check if code has expired
  IF secret_code_record.expires_at IS NOT NULL AND secret_code_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code secret expiré');
  END IF;
  
  -- Check if code has reached max uses
  IF secret_code_record.max_uses IS NOT NULL AND secret_code_record.current_uses >= secret_code_record.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code secret épuisé');
  END IF;
  
  -- Check if user already used this code
  SELECT * INTO user_code_record
  FROM user_secret_codes
  WHERE user_id = user_id_input AND code_id = secret_code_record.id;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code déjà utilisé');
  END IF;
  
  -- Calculate expiration date for monthly codes
  IF secret_code_record.type = 'monthly' THEN
    expires_at_value = now() + interval '30 days';
  ELSE
    expires_at_value = NULL; -- Lifetime codes don't expire
  END IF;
  
  -- Activate the code
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (user_id_input, secret_code_record.id, expires_at_value);
  
  -- Update usage count
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = secret_code_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'type', secret_code_record.type,
    'expires_at', expires_at_value
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Erreur lors de l''activation du code');
END;
$$;

-- Create function to update secret codes timestamp
CREATE OR REPLACE FUNCTION update_secret_codes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;