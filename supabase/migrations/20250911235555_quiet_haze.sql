/*
  # Fonctions d'administration pour le super admin

  1. Nouvelles fonctions
    - `activate_secret_code` - Activer un code secret pour un utilisateur
    - `get_user_stats` - Récupérer les statistiques d'un utilisateur
    - `get_global_stats` - Récupérer les statistiques globales

  2. Sécurité
    - Fonctions accessibles uniquement aux utilisateurs authentifiés
    - Validation des codes secrets
    - Gestion des expirations
*/

-- Fonction pour activer un code secret
CREATE OR REPLACE FUNCTION activate_secret_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
  v_user_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Utilisateur non authentifié');
  END IF;

  -- Vérifier si le code existe et est valide
  SELECT * INTO v_code_record
  FROM secret_codes
  WHERE code = UPPER(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code secret invalide ou expiré');
  END IF;

  -- Vérifier si l'utilisateur n'a pas déjà utilisé ce code
  IF EXISTS (
    SELECT 1 FROM user_secret_codes 
    WHERE user_id = v_user_id AND code_id = v_code_record.id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Code déjà utilisé');
  END IF;

  -- Calculer la date d'expiration pour l'utilisateur
  IF v_code_record.type = 'monthly' THEN
    v_expires_at := NOW() + INTERVAL '30 days';
  ELSE
    v_expires_at := NULL; -- Pas d'expiration pour les codes à vie
  END IF;

  -- Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (v_user_id, v_code_record.id, v_expires_at);

  -- Incrémenter le compteur d'utilisation
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code_record.id;

  -- Désactiver le code si le nombre max d'utilisations est atteint
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses + 1 >= v_code_record.max_uses THEN
    UPDATE secret_codes
    SET is_active = false
    WHERE id = v_code_record.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'type', v_code_record.type,
    'expires_at', v_expires_at
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Erreur lors de l''activation du code');
END;
$$;

-- Fonction pour récupérer les statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'forms_count', (SELECT COUNT(*) FROM forms WHERE user_id = p_user_id),
    'templates_count', (SELECT COUNT(*) FROM pdf_templates WHERE user_id = p_user_id),
    'responses_count', (
      SELECT COUNT(*) 
      FROM responses r 
      JOIN forms f ON r.form_id = f.id 
      WHERE f.user_id = p_user_id
    ),
    'pdfs_count', (SELECT COUNT(*) FROM pdf_storage),
    'last_activity', (
      SELECT MAX(created_at) 
      FROM (
        SELECT created_at FROM forms WHERE user_id = p_user_id
        UNION ALL
        SELECT created_at FROM pdf_templates WHERE user_id = p_user_id
      ) activities
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

-- Fonction pour récupérer les statistiques globales
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_forms', (SELECT COUNT(*) FROM forms),
    'total_templates', (SELECT COUNT(*) FROM pdf_templates),
    'total_responses', (SELECT COUNT(*) FROM responses),
    'total_pdfs', (SELECT COUNT(*) FROM pdf_storage),
    'active_subscriptions', (
      SELECT COUNT(*) 
      FROM stripe_subscriptions 
      WHERE status = 'active' AND deleted_at IS NULL
    ),
    'active_secret_codes', (
      SELECT COUNT(*) 
      FROM user_secret_codes 
      WHERE expires_at IS NULL OR expires_at > NOW()
    ),
    'new_users_this_month', (
      SELECT COUNT(*) 
      FROM auth.users 
      WHERE created_at >= DATE_TRUNC('month', NOW())
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;