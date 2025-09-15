/*
  # Create system settings

  1. New Tables
    - `system_settings` - System configuration
  
  2. Security
    - Enable RLS
    - Public can read maintenance_mode
    - Super admins can manage all settings
  
  3. Default Settings
    - maintenance_mode setting
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read maintenance_mode setting"
  ON system_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'maintenance_mode'::text);

CREATE POLICY "Super admins can manage all settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  )
  WITH CHECK (
    (jwt() ->> 'email'::text) = 'admin@signfast.com'::text OR
    (jwt() ->> 'email'::text) ~~ '%@admin.signfast.com'::text
  );

-- Insert default settings
INSERT INTO system_settings (key, value, created_at, updated_at)
VALUES ('maintenance_mode', 'false', now(), now())
ON CONFLICT (key) DO NOTHING;