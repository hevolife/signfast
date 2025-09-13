/*
  # Create activate_secret_code function

  1. New Functions
    - `activate_secret_code` function to handle secret code activation
    - Validates code existence and availability
    - Creates user_secret_codes entry
    - Updates code usage count

  2. Security
    - Function is accessible to authenticated users
    - Validates code limits and expiration
    - Prevents duplicate activations
*/

-- Function to activate a secret code for a user
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
BEGIN
  -- Validate input
  IF p_code IS NULL OR p_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code et utilisateur requis');
  END IF;

  -- Find the secret code
  SELECT * INTO v_code_record
  FROM secret_codes
  WHERE code = UPPER(p_code) AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code secret invalide ou inactif');
  END IF;

  -- Check if code has expired
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Code secret expiré');
  END IF;

  -- Check if code has reached max uses
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Code secret épuisé');
  END IF;

  -- Check if user has already activated this code
  SELECT * INTO v_existing_activation
  FROM user_secret_codes
  WHERE user_id = p_user_id AND code_id = v_code_record.id;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Code déjà activé pour cet utilisateur');
  END IF;

  -- Calculate expiration date for user activation
  IF v_code_record.type = 'lifetime' THEN
    v_expires_at := NULL; -- Never expires
  ELSE
    v_expires_at := NOW() + INTERVAL '30 days'; -- Monthly code expires in 30 days
  END IF;

  -- Activate the code for the user
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (p_user_id, v_code_record.id, v_expires_at);

  -- Update code usage count
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code_record.id;

  -- Return success with code details
  RETURN json_build_object(
    'success', true,
    'type', v_code_record.type,
    'expires_at', v_expires_at,
    'message', CASE 
      WHEN v_code_record.type = 'lifetime' THEN 'Accès à vie activé !'
      ELSE 'Accès mensuel activé pour 30 jours'
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Erreur lors de l''activation: ' || SQLERRM);
END;
$$;