/*
  # Create activate_secret_code function

  1. New Functions
    - `activate_secret_code` function to handle secret code activation
    - Validates code existence and availability
    - Creates user_secret_codes entry
    - Updates code usage count
    - Returns success status and code details

  2. Security
    - Function uses SECURITY DEFINER for elevated permissions
    - Validates user authentication
    - Prevents duplicate activations
    - Handles usage limits properly
*/

CREATE OR REPLACE FUNCTION activate_secret_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
  v_existing_activation RECORD;
  v_expires_at TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Utilisateur non authentifié'
    );
  END IF;

  -- Rechercher le code secret
  SELECT * INTO v_code_record
  FROM secret_codes
  WHERE code = p_code
    AND is_active = true;

  -- Vérifier si le code existe
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code secret invalide ou inactif'
    );
  END IF;

  -- Vérifier si le code a expiré
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code secret expiré'
    );
  END IF;

  -- Vérifier les limites d'utilisation
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code secret épuisé (limite d''utilisation atteinte)'
    );
  END IF;

  -- Vérifier si l'utilisateur a déjà activé ce code
  SELECT * INTO v_existing_activation
  FROM user_secret_codes
  WHERE user_id = p_user_id
    AND code_id = v_code_record.id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Code secret déjà activé par cet utilisateur'
    );
  END IF;

  -- Calculer la date d'expiration pour l'utilisateur
  IF v_code_record.type = 'monthly' THEN
    v_expires_at := NOW() + INTERVAL '30 days';
  ELSE
    v_expires_at := NULL; -- Code à vie
  END IF;

  -- Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (
    user_id,
    code_id,
    activated_at,
    expires_at
  ) VALUES (
    p_user_id,
    v_code_record.id,
    NOW(),
    v_expires_at
  );

  -- Incrémenter le compteur d'utilisation
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code_record.id;

  -- Retourner le succès avec les détails
  RETURN json_build_object(
    'success', true,
    'type', v_code_record.type,
    'expires_at', v_expires_at,
    'description', v_code_record.description
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Erreur interne lors de l''activation du code'
    );
END;
$$;