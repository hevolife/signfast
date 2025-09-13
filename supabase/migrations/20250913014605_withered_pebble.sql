/*
  # Create unlimited secret code

  1. New Secret Code
    - Code: UNLIMITED2025
    - Type: lifetime (accès à vie)
    - Description: Code illimité pour accès premium permanent
    - Max uses: 1000 (très élevé)
    - Active: true

  2. Purpose
    - Permet d'activer l'accès premium sans limite de temps
    - Utilisable par de nombreux utilisateurs
*/

-- Insérer le code secret illimité
INSERT INTO secret_codes (
  code,
  type,
  description,
  max_uses,
  current_uses,
  expires_at,
  is_active
) VALUES (
  'UNLIMITED2025',
  'lifetime',
  'Code illimité pour accès premium permanent',
  1000,
  0,
  NULL,
  true
) ON CONFLICT (code) DO UPDATE SET
  is_active = true,
  max_uses = 1000,
  current_uses = 0;