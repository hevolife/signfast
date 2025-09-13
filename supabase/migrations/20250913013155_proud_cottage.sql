/*
  # Fix activate secret code function

  1. Function Updates
    - Allow multiple secret codes per user
    - Replace existing codes with new ones if better
    - Proper validation and error handling
  
  2. Logic Changes
    - Remove restriction on existing codes
    - Allow upgrading from monthly to lifetime
    - Better expiration handling
*/

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS activate_secret_code(text, uuid);

-- Créer la nouvelle fonction améliorée
CREATE OR REPLACE FUNCTION activate_secret_code(
  p_code text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_code secret_codes%ROWTYPE;
  v_existing_code user_secret_codes%ROWTYPE;
  v_expires_at timestamptz;
  v_should_replace boolean := false;
BEGIN
  -- Vérifier que le code existe et est actif
  SELECT * INTO v_secret_code
  FROM secret_codes
  WHERE code = p_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret invalide ou inactif'
    );
  END IF;

  -- Vérifier si le code a encore des utilisations disponibles
  IF v_secret_code.max_uses IS NOT NULL AND v_secret_code.current_uses >= v_secret_code.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code secret a atteint sa limite d''utilisation'
    );
  END IF;

  -- Vérifier si le code est expiré
  IF v_secret_code.expires_at IS NOT NULL AND v_secret_code.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code secret a expiré'
    );
  END IF;

  -- Vérifier si l'utilisateur a déjà un code actif
  SELECT * INTO v_existing_code
  FROM user_secret_codes usc
  JOIN secret_codes sc ON usc.code_id = sc.id
  WHERE usc.user_id = p_user_id 
    AND sc.is_active = true
    AND (usc.expires_at IS NULL OR usc.expires_at > now());

  -- Si l'utilisateur a déjà un code, décider s'il faut le remplacer
  IF FOUND THEN
    -- Récupérer le type du code existant
    SELECT sc.type INTO v_existing_code
    FROM user_secret_codes usc
    JOIN secret_codes sc ON usc.code_id = sc.id
    WHERE usc.user_id = p_user_id 
      AND sc.is_active = true
      AND (usc.expires_at IS NULL OR usc.expires_at > now())
    LIMIT 1;

    -- Permettre le remplacement si :
    -- 1. Le nouveau code est à vie et l'ancien est mensuel
    -- 2. Le nouveau code est mensuel et l'ancien expire bientôt (moins de 7 jours)
    IF v_secret_code.type = 'lifetime' THEN
      v_should_replace := true;
      RAISE NOTICE 'Remplacement par code à vie autorisé';
    ELSIF v_secret_code.type = 'monthly' AND v_existing_code.expires_at IS NOT NULL 
          AND v_existing_code.expires_at < (now() + interval '7 days') THEN
      v_should_replace := true;
      RAISE NOTICE 'Remplacement par code mensuel autorisé (expiration proche)';
    ELSE
      -- Informer l'utilisateur qu'il a déjà un code actif
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Vous avez déjà un code secret actif. Attendez son expiration ou contactez le support.'
      );
    END IF;

    -- Supprimer l'ancien code si remplacement autorisé
    IF v_should_replace THEN
      DELETE FROM user_secret_codes 
      WHERE user_id = p_user_id;
      RAISE NOTICE 'Ancien code supprimé pour remplacement';
    END IF;
  END IF;

  -- Calculer la date d'expiration pour le nouveau code
  IF v_secret_code.type = 'monthly' THEN
    v_expires_at := now() + interval '30 days';
  ELSE
    v_expires_at := NULL; -- Code à vie
  END IF;

  -- Activer le nouveau code
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (p_user_id, v_secret_code.id, v_expires_at);

  -- Incrémenter le compteur d'utilisation
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = v_secret_code.id;

  -- Retourner le succès avec les détails
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN v_secret_code.type = 'lifetime' THEN 'Code à vie activé avec succès !'
      ELSE 'Code mensuel activé avec succès !'
    END,
    'type', v_secret_code.type,
    'expires_at', v_expires_at,
    'replaced', v_should_replace
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur activation code: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur lors de l''activation du code: ' || SQLERRM
    );
END;
$$;