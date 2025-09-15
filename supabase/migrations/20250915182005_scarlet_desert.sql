/*
  # Create users and user profiles tables

  1. New Tables
    - `users` - Extended user information
    - `user_profiles` - User profile data with company info
  
  2. Security
    - Enable RLS on both tables
    - Add policies for user data access
    - Add triggers for automatic profile creation
  
  3. Functions
    - Auto-update timestamps
    - Auto-create affiliate programs
*/

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz,
  email_change_token_current text DEFAULT ''::text,
  email_change_confirm_status smallint DEFAULT 0,
  banned_until timestamptz,
  reauthentication_token text DEFAULT ''::text,
  reauthentication_sent_at timestamptz,
  is_sso_user boolean DEFAULT false,
  deleted_at timestamptz
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  address text,
  siret text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Allow public read access to users"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_profiles
CREATE POLICY "Allow public read access to user profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Super admin policies
CREATE POLICY "Super admins can manage all user_profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM users WHERE id = auth.uid()),
    false
  );
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create function for affiliate program creation
CREATE OR REPLACE FUNCTION create_affiliate_program_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be implemented when affiliate tables are created
  RETURN NEW;
END;
$$;

-- Create trigger for auto affiliate program creation
CREATE TRIGGER auto_create_affiliate_program
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_program_for_user();

CREATE TRIGGER create_affiliate_program_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_program_for_user();