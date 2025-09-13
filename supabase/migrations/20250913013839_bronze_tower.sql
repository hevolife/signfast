/*
  # Fix activate_secret_code function - correct all variable references

  1. Function Updates
    - Fix all variable name references
    - Ensure consistent variable naming
    - Add proper error handling
  2. Security
    - Maintain RLS policies
    - Proper validation checks
*/

CREATE OR REPLACE FUNCTION activate_secret_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code_record RECORD;
    v_existing_code RECORD;
    expires_at_value timestamptz;
    result jsonb;
BEGIN
    RAISE LOG 'activate_secret_code: Début activation code % pour user %', p_code, p_user_id;
    
    -- 1. Vérifier que le code existe et est valide
    SELECT * INTO v_code_record
    FROM secret_codes 
    WHERE code = p_code 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE LOG 'activate_secret_code: Code % non trouvé ou inactif', p_code;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Code secret invalide ou inactif'
        );
    END IF;
    
    RAISE LOG 'activate_secret_code: Code trouvé - type: %, max_uses: %, current_uses: %', 
        v_code_record.type, v_code_record.max_uses, v_code_record.current_uses;
    
    -- 2. Vérifier les utilisations
    IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
        RAISE LOG 'activate_secret_code: Code % épuisé (%/%)', p_code, v_code_record.current_uses, v_code_record.max_uses;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ce code secret a atteint sa limite d''utilisation'
        );
    END IF;
    
    -- 3. Vérifier l'expiration
    IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < NOW() THEN
        RAISE LOG 'activate_secret_code: Code % expiré le %', p_code, v_code_record.expires_at;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ce code secret a expiré'
        );
    END IF;
    
    -- 4. Calculer la date d'expiration pour l'utilisateur
    IF v_code_record.type = 'lifetime' THEN
        expires_at_value := NULL;
        RAISE LOG 'activate_secret_code: Code à vie - pas d''expiration';
    ELSE
        expires_at_value := NOW() + INTERVAL '30 days';
        RAISE LOG 'activate_secret_code: Code mensuel - expiration: %', expires_at_value;
    END IF;
    
    -- 5. Vérifier si l'utilisateur a déjà un code actif
    SELECT usc.*, sc.type as code_type INTO v_existing_code
    FROM user_secret_codes usc
    JOIN secret_codes sc ON usc.code_id = sc.id
    WHERE usc.user_id = p_user_id
    AND sc.is_active = true
    AND (usc.expires_at IS NULL OR usc.expires_at > NOW())
    ORDER BY usc.activated_at DESC
    LIMIT 1;
    
    IF FOUND THEN
        RAISE LOG 'activate_secret_code: Code existant trouvé - type: %, expires_at: %', 
            v_existing_code.code_type, v_existing_code.expires_at;
        
        -- Permettre le remplacement dans certains cas
        IF v_code_record.type = 'lifetime' AND v_existing_code.code_type = 'monthly' THEN
            RAISE LOG 'activate_secret_code: Remplacement code mensuel par code à vie autorisé';
            -- Supprimer l'ancien code
            DELETE FROM user_secret_codes WHERE id = v_existing_code.id;
        ELSIF v_code_record.type = 'monthly' AND v_existing_code.code_type = 'monthly' 
              AND v_existing_code.expires_at IS NOT NULL 
              AND v_existing_code.expires_at < NOW() + INTERVAL '7 days' THEN
            RAISE LOG 'activate_secret_code: Remplacement code mensuel expirant bientôt autorisé';
            -- Supprimer l'ancien code
            DELETE FROM user_secret_codes WHERE id = v_existing_code.id;
        ELSE
            RAISE LOG 'activate_secret_code: Code déjà actif - remplacement non autorisé';
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Vous avez déjà un code secret actif. Attendez son expiration ou contactez le support.'
            );
        END IF;
    END IF;
    
    -- 6. Activer le code pour l'utilisateur
    INSERT INTO user_secret_codes (user_id, code_id, expires_at)
    VALUES (p_user_id, v_code_record.id, expires_at_value);
    
    RAISE LOG 'activate_secret_code: Code activé pour user % - expires_at: %', p_user_id, expires_at_value;
    
    -- 7. Incrémenter le compteur d'utilisation
    UPDATE secret_codes 
    SET current_uses = current_uses + 1
    WHERE id = v_code_record.id;
    
    RAISE LOG 'activate_secret_code: Compteur mis à jour - nouvelles utilisations: %', v_code_record.current_uses + 1;
    
    -- 8. Retourner le succès
    result := jsonb_build_object(
        'success', true,
        'message', CASE 
            WHEN v_code_record.type = 'lifetime' THEN 'Code à vie activé avec succès !'
            ELSE 'Code mensuel activé avec succès !'
        END,
        'type', v_code_record.type,
        'expires_at', expires_at_value
    );
    
    RAISE LOG 'activate_secret_code: Succès - résultat: %', result;
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'activate_secret_code: ERREUR - SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erreur interne lors de l''activation du code: ' || SQLERRM
        );
END;
$$;