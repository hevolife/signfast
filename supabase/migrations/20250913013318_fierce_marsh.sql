/*
  # Fonction d'activation des codes secrets

  1. Nouvelle fonction
    - `activate_secret_code(p_code text, p_user_id uuid)`
    - Vérifie la validité du code
    - Active le code pour l'utilisateur
    - Gère les codes multiples et les remplacements

  2. Sécurité
    - Vérifications complètes de validité
    - Gestion des erreurs appropriée
    - Logs détaillés pour debug
*/

-- Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS activate_secret_code(text, uuid);

-- Créer la nouvelle fonction d'activation des codes secrets
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
  v_result jsonb;
BEGIN
  -- Log de début
  RAISE NOTICE 'Activation code secret: % pour user: %', p_code, p_user_id;
  
  -- 1. Vérifier que le code existe et est actif
  SELECT * INTO v_secret_code
  FROM secret_codes
  WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Code non trouvé ou inactif: %', p_code;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code secret invalide ou inactif'
    );
  END IF;
  
  RAISE NOTICE 'Code trouvé: type=%, max_uses=%, current_uses=%', 
    v_secret_code.type, v_secret_code.max_uses, v_secret_code.current_uses;
  
  -- 2. Vérifier si le code a encore des utilisations disponibles
  IF v_secret_code.max_uses IS NOT NULL AND v_secret_code.current_uses >= v_secret_code.max_uses THEN
    RAISE NOTICE 'Code épuisé: %/%', v_secret_code.current_uses, v_secret_code.max_uses;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code secret a atteint sa limite d''utilisation'
    );
  END IF;
  
  -- 3. Vérifier si le code est expiré (pour les codes mensuels)
  IF v_secret_code.expires_at IS NOT NULL AND v_secret_code.expires_at < NOW() THEN
    RAISE NOTICE 'Code expiré: %', v_secret_code.expires_at;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ce code secret a expiré'
    );
  END IF;
  
  -- 4. Vérifier si l'utilisateur a déjà activé ce code spécifique
  SELECT * INTO v_existing_code
  FROM user_secret_codes
  WHERE user_id = p_user_id AND code_id = v_secret_code.id;
  
  IF FOUND THEN
    RAISE NOTICE 'Code déjà activé par cet utilisateur';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vous avez déjà activé ce code secret'
    );
  END IF;
  
  -- 5. Gérer les codes existants selon le type
  IF v_secret_code.type = 'lifetime' THEN
    -- Pour un code à vie, supprimer tous les codes existants de l'utilisateur
    RAISE NOTICE 'Code à vie: suppression des codes existants';
    DELETE FROM user_secret_codes WHERE user_id = p_user_id;
  ELSIF v_secret_code.type = 'monthly' THEN
    -- Pour un code mensuel, supprimer seulement les autres codes mensuels
    RAISE NOTICE 'Code mensuel: suppression des autres codes mensuels';
    DELETE FROM user_secret_codes 
    WHERE user_id = p_user_id 
    AND code_id IN (
      SELECT id FROM secret_codes WHERE type = 'monthly'
    );
  END IF;
  
  -- 6. Calculer la date d'expiration
  DECLARE
    v_expires_at timestamptz;
  BEGIN
    IF v_secret_code.type = 'lifetime' THEN
      v_expires_at := NULL; -- Pas d'expiration pour les codes à vie
    ELSIF v_secret_code.type = 'monthly' THEN
      v_expires_at := NOW() + INTERVAL '30 days';
    ELSE
      v_expires_at := v_secret_code.expires_at;
    END IF;
    
    RAISE NOTICE 'Date expiration calculée: %', v_expires_at;
  END;
  
  -- 7. Activer le code pour l'utilisateur
  INSERT INTO user_secret_codes (user_id, code_id, expires_at)
  VALUES (p_user_id, v_secret_code.id, v_expires_at);
  
  RAISE NOTICE 'Code activé avec succès dans user_secret_codes';
  
  -- 8. Incrémenter le compteur d'utilisation
  UPDATE secret_codes
  SET current_uses = current_uses + 1
  WHERE id = v_secret_code.id;
  
  RAISE NOTICE 'Compteur mis à jour: %', v_secret_code.current_uses + 1;
  
  -- 9. Retourner le succès avec les détails
  v_result := jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN v_secret_code.type = 'lifetime' THEN 'Code à vie activé avec succès !'
      ELSE 'Code mensuel activé avec succès !'
    END,
    'type', v_secret_code.type,
    'expires_at', v_expires_at,
    'code_description', v_secret_code.description
  );
  
  RAISE NOTICE 'Retour succès: %', v_result;
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur dans activate_secret_code: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erreur interne lors de l''activation du code: ' || SQLERRM
    );
END;
$$;