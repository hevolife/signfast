/*
  # Create system_settings table

  1. New Tables
    - `system_settings`
      - `key` (text, primary key) - Setting identifier
      - `value` (text) - Setting value
      - `updated_by` (uuid) - User who last updated the setting
      - `updated_at` (timestamp) - When the setting was last updated
      - `created_at` (timestamp) - When the setting was created

  2. Security
    - Enable RLS on `system_settings` table
    - Add policy for super admins to read/write settings
    - Add policy for authenticated users to read maintenance_mode setting

  3. Initial Data
    - Insert default maintenance_mode setting (false)
*/

CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy for super admins to manage all settings
CREATE POLICY "Super admins can manage all settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'admin@signfast.com' OR 
    auth.jwt() ->> 'email' LIKE '%@admin.signfast.com'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@signfast.com' OR 
    auth.jwt() ->> 'email' LIKE '%@admin.signfast.com'
  );

-- Policy for all users to read maintenance_mode setting
CREATE POLICY "Anyone can read maintenance_mode setting"
  ON system_settings
  FOR SELECT
  TO authenticated, anon
  USING (key = 'maintenance_mode');

-- Insert default maintenance_mode setting
INSERT INTO system_settings (key, value) 
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;