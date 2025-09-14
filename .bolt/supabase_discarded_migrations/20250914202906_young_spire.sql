/*
  # Grant Super Admin Full Permissions

  1. Security Changes
    - Add super admin bypass policies for all tables
    - Allow super admins to read, insert, update, delete any data
    - Bypass RLS for super admin emails

  2. Tables Updated
    - forms: Full CRUD access for super admins
    - responses: Full CRUD access for super admins  
    - pdf_storage: Full CRUD access for super admins
    - pdf_templates: Full CRUD access for super admins
    - user_profiles: Full CRUD access for super admins
    - affiliate_programs: Full CRUD access for super admins
    - affiliate_referrals: Full CRUD access for super admins
    - stripe_customers: Full CRUD access for super admins
    - stripe_subscriptions: Full CRUD access for super admins
    - stripe_orders: Full CRUD access for super admins
    - user_secret_codes: Full CRUD access for super admins
    - secret_codes: Full CRUD access for super admins

  3. Super Admin Detection
    - Email equals 'admin@signfast.com'
    - Email ends with '@admin.signfast.com'
*/

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT (
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR 
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  );
$$;

-- Grant super admin full access to forms table
CREATE POLICY "Super admins can manage all forms"
  ON forms
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to responses table
CREATE POLICY "Super admins can manage all responses"
  ON responses
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to pdf_storage table
CREATE POLICY "Super admins can manage all pdf_storage"
  ON pdf_storage
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to pdf_templates table
CREATE POLICY "Super admins can manage all pdf_templates"
  ON pdf_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to user_profiles table
CREATE POLICY "Super admins can manage all user_profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to stripe_customers table
CREATE POLICY "Super admins can manage all stripe_customers"
  ON stripe_customers
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to stripe_subscriptions table
CREATE POLICY "Super admins can manage all stripe_subscriptions"
  ON stripe_subscriptions
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to stripe_orders table
CREATE POLICY "Super admins can manage all stripe_orders"
  ON stripe_orders
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin full access to user_secret_codes table
CREATE POLICY "Super admins can manage all user_secret_codes"
  ON user_secret_codes
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Update existing affiliate policies to include super admin access
DROP POLICY IF EXISTS "Super admins can manage all affiliate programs" ON affiliate_programs;
CREATE POLICY "Super admins can manage all affiliate programs"
  ON affiliate_programs
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins can manage all referrals" ON affiliate_referrals;
CREATE POLICY "Super admins can manage all affiliate_referrals"
  ON affiliate_referrals
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Update existing secret_codes policy to include super admin access
DROP POLICY IF EXISTS "Admins can manage secret codes" ON secret_codes;
CREATE POLICY "Super admins can manage all secret_codes"
  ON secret_codes
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Update existing system_settings policy to include super admin access
DROP POLICY IF EXISTS "Super admins can manage all settings" ON system_settings;
CREATE POLICY "Super admins can manage all system_settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());