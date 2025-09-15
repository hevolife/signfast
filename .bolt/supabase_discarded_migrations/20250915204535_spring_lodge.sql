/*
  # Initialisation Supabase Self-Hosted pour SignFast

  Ce script initialise la base de données PostgreSQL pour Supabase self-hosted
  avec tous les schémas et extensions nécessaires.

  1. Extensions PostgreSQL
  2. Schémas de base
  3. Fonctions d'authentification
  4. Tables système
  5. Politiques de sécurité
*/

-- Extensions nécessaires pour Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Créer les schémas de base
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Fonction pour générer des UUIDs
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT gen_random_uuid();
$$;

-- Fonction pour obtenir l'UID de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid;
$$;

-- Fonction pour obtenir le JWT
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb,
    '{}'::jsonb
  );
$$;

-- Fonction pour vérifier si l'utilisateur est super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') = 'admin@signfast.com' OR
    (auth.jwt() ->> 'email') LIKE '%@admin.signfast.com',
    false
  );
$$;

-- Fonction pour obtenir l'UID (alias)
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Table des utilisateurs dans auth schema (simplifiée pour self-hosted)
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean DEFAULT false
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);

-- RLS sur auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture de ses propres données
CREATE POLICY "Users can read own data" ON auth.users
  FOR SELECT USING (auth.uid() = id);

-- Politique pour les super admins
CREATE POLICY "Super admins can manage all users" ON auth.users
  FOR ALL USING (is_super_admin());

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger pour auth.users
DROP TRIGGER IF EXISTS update_auth_users_updated_at ON auth.users;
CREATE TRIGGER update_auth_users_updated_at
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer l'utilisateur admin par défaut
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  is_super_admin,
  raw_app_meta_data
) VALUES (
  gen_random_uuid(),
  'admin@signfast.com',
  crypt('SuperAdmin2025!', gen_salt('bf')),
  now(),
  true,
  '{"provider": "email", "providers": ["email"]}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Créer les rôles nécessaires
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

-- Permissions sur les schémas
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Permissions sur auth schema
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO anon, authenticated, service_role;

-- Configuration RLS par défaut
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;