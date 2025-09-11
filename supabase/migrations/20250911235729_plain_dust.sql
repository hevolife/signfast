/*
  # Création du compte Super Admin

  1. Compte Admin
    - Email: admin@signfast.com
    - Mot de passe: SuperAdmin2025!
    - Rôle: Super administrateur
    - Accès complet à toutes les fonctionnalités

  2. Profil Admin
    - Nom: Super Admin
    - Entreprise: SignFast Administration
    - Permissions complètes

  3. Sécurité
    - Compte confirmé automatiquement
    - Accès au dashboard admin
*/

-- Insérer le compte super admin directement dans auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@signfast.com',
  crypt('SuperAdmin2025!', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Super", "last_name": "Admin", "company": "SignFast Administration"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- Créer le profil pour le super admin
INSERT INTO public.user_profiles (
  user_id,
  first_name,
  last_name,
  company_name,
  address,
  created_at,
  updated_at
) 
SELECT 
  id,
  'Super',
  'Admin',
  'SignFast Administration',
  'France',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'admin@signfast.com'
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  company_name = EXCLUDED.company_name,
  address = EXCLUDED.address,
  updated_at = NOW();

-- Créer quelques codes secrets de test
INSERT INTO public.secret_codes (
  code,
  type,
  description,
  max_uses,
  current_uses,
  expires_at,
  is_active
) VALUES 
  ('ADMIN2025', 'lifetime', 'Code à vie pour tests admin', 100, 0, NULL, true),
  ('MONTHLY01', 'monthly', 'Code mensuel pour tests', 10, 0, NOW() + INTERVAL '30 days', true),
  ('TESTLIFE', 'lifetime', 'Code à vie de test', 1, 0, NULL, true),
  ('DEMO2025', 'monthly', 'Code démo mensuel', 5, 0, NOW() + INTERVAL '30 days', true)
ON CONFLICT (code) DO NOTHING;