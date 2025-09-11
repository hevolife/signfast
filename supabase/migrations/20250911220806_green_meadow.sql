/*
  # Ajouter table des profils utilisateur

  1. Nouvelle table
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `company_name` (text)
      - `address` (text)
      - `siret` (text)
      - `logo_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `user_profiles`
    - Politique pour que les utilisateurs puissent gérer leur propre profil
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name text,
  last_name text,
  company_name text,
  address text,
  siret text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent lire leur propre profil
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent créer leur propre profil
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();