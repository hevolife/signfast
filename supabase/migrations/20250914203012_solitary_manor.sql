/*
  # Grant Super Admin Full Permissions

  1. Helper Function
    - Create `is_super_admin()` function to detect super admins
    - Checks for admin@signfast.com or emails ending with @admin.signfast.com

  2. Security Policies
    - Add super admin policies to all tables for full CRUD access
    - Super admins can bypass all existing restrictions
    - Maintains existing user policies for normal users

  3. Tables Updated
    - forms: Super admin can manage all forms
    - responses: Super admin can manage all responses  
    - pdf_templates: Super admin can manage all templates
    - pdf_storage: Super admin can manage all PDFs
    - user_profiles: Super admin can manage all profiles
    - affiliate_programs: Super admin can manage all programs
    - affiliate_referrals: Super admin can manage all referrals
    - secret_codes: Super admin can manage all codes
    - user_secret_codes: Super admin can manage all activations
    - system_settings: Super admin can manage all settings
*/

-- Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT (
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR 
    (jwt() ->> 'email'::text) LIKE '%@admin.signfast.com'::text
  );
$$;

-- Forms table: Super admin full access
CREATE POLICY "Super admins can manage all forms"
  ON forms
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Responses table: Super admin full access
CREATE POLICY "Super admins can manage all responses"
  ON responses
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- PDF Templates table: Super admin full access
CREATE POLICY "Super admins can manage all pdf templates"
  ON pdf_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- PDF Storage table: Super admin full access
CREATE POLICY "Super admins can manage all pdf storage"
  ON pdf_storage
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- User Profiles table: Super admin full access
CREATE POLICY "Super admins can manage all user profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Affiliate Programs table: Super admin full access
CREATE POLICY "Super admins can manage all affiliate programs"
  ON affiliate_programs
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Affiliate Referrals table: Super admin full access
CREATE POLICY "Super admins can manage all affiliate referrals"
  ON affiliate_referrals
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Secret Codes table: Super admin full access
CREATE POLICY "Super admins can manage all secret codes"
  ON secret_codes
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- User Secret Codes table: Super admin full access
CREATE POLICY "Super admins can manage all user secret codes"
  ON user_secret_codes
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- System Settings table: Super admin full access (update existing policy)
DROP POLICY IF EXISTS "Super admins can manage all settings" ON system_settings;
CREATE POLICY "Super admins can manage all settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());