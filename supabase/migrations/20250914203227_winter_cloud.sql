/*
  # Super Admin Permissions

  1. Security
    - Grant super admins full access to all tables
    - Allow super admins to bypass RLS on all operations
*/

-- Create helper function to check if user is super admin
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

-- Grant super admin access to forms table
CREATE POLICY "Super admins can manage all forms"
  ON forms
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin access to responses table
CREATE POLICY "Super admins can manage all responses"
  ON responses
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin access to pdf_templates table
CREATE POLICY "Super admins can manage all pdf_templates"
  ON pdf_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin access to pdf_storage table
CREATE POLICY "Super admins can manage all pdf_storage"
  ON pdf_storage
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Grant super admin access to user_profiles table
CREATE POLICY "Super admins can manage all user_profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());