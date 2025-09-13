/*
  # Add maintenance mode system

  1. New Tables
    - `system_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (text)
      - `description` (text)
      - `updated_at` (timestamp)
      - `updated_by` (uuid, references users)

  2. Security
    - Enable RLS on `system_settings` table
    - Add policy for super admins only

  3. Initial Data
    - Insert maintenance_mode setting (default: false)
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Seuls les super admins peuvent lire et modifier les paramètres système
CREATE POLICY "Super admins can manage system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.email = 'admin@signfast.com' OR users.email LIKE '%@admin.signfast.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.email = 'admin@signfast.com' OR users.email LIKE '%@admin.signfast.com')
    )
  );

-- Insérer le paramètre de maintenance par défaut
INSERT INTO system_settings (key, value, description) 
VALUES ('maintenance_mode', 'false', 'Active ou désactive le mode maintenance du site')
ON CONFLICT (key) DO NOTHING;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();