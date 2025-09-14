/*
  # Grant Super Admin Full Permissions

  1. Security
    - Create helper function to detect super admins
    - Add policies for super admin access on all tables
    - Grant full CRUD permissions to super admins

  2. Tables Updated
    - forms: Allow super admins to manage all forms
    - responses: Allow super admins to manage all responses  
    - pdf_storage: Allow super admins to manage all PDFs
    - pdf_templates: Allow super admins to manage all templates
    - user_profiles: Allow super admins to manage all profiles
    - affiliate_programs: Allow super admins to manage all affiliate programs
    - affiliate_referrals: Allow super admins to manage all referrals
    - secret_codes: Allow super admins to manage all secret codes
    - user_secret_codes: Allow super admins to manage all user codes
*/

-- Create helper function to detect super admins
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR
    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com',
    false
  );
$$;

-- Forms table - Super admin policies
CREATE POLICY "Super admins can manage all forms"
  ON forms
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Responses table - Super admin policies  
CREATE POLICY "Super admins can manage all responses"
  ON responses
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- PDF Storage table - Super admin policies
CREATE POLICY "Super admins can manage all PDFs"
  ON pdf_storage
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- PDF Templates table - Super admin policies
CREATE POLICY "Super admins can manage all templates"
  ON pdf_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- User Profiles table - Super admin policies
CREATE POLICY "Super admins can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Affiliate Programs table - Super admin policies
CREATE POLICY "Super admins can manage all affiliate programs"
  ON affiliate_programs
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Affiliate Referrals table - Super admin policies
CREATE POLICY "Super admins can manage all referrals"
  ON affiliate_referrals
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Secret Codes table - Super admin policies
CREATE POLICY "Super admins can manage all secret codes"
  ON secret_codes
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- User Secret Codes table - Super admin policies
CREATE POLICY "Super admins can manage all user codes"
  ON user_secret_codes
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());