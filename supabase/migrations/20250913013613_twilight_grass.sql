/*
  # Fix activate_secret_code function variable error

  1. Corrections
    - Fix variable name from v_expires_at to expires_at_value
    - Ensure all variables are properly declared
    - Fix any other variable naming issues

  2. Function
    - Complete rewrite of activate_secret_code function with correct variable names
*/

CREATE OR REPLACE FUNCTION activate_secret_code(p_code TEXT, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    code_record RECORD;
    expires_at_value TIMESTAMPTZ;
    existing_code_record RECORD;
BEGIN
    RAISE LOG 'activate_secret_code: Début activation code % pour user %', p_code, p_user_id;
    
    -- 1. Vérifier que le code existe et est valide
    SELECT * INTO code_record
    FROM secret_codes 
    WHERE code = p_code 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE LOG 'activate_secret_code: Code % non trouvé ou inactif', p_code;
        RETURN json_build_object(
            'success', false,
            'error', 'Code secret invalide ou inactif'
        );
    END IF;
    
    RAISE LOG 'activate_secret_code: Code trouvé - type: %, max_uses: %, current_uses: %', 
        code_record.type, code_record.max_uses, code_record.current_uses;
    
    -- 2. Vérifier si le code a encore des utilisations disponibles
    IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
        RAISE LOG 'activate_secret_code: Code % épuisé (%/%)', p_code, code_record.current_uses, code_record.max_uses;
        RETURN json_build_object(
            'success', false,
            'error', 'Ce code secret a été utilisé le maximum de fois autorisé'
        );
    END IF;
    
    -- 3. Vérifier si le code est expiré
    IF code_record.expires_at IS NOT NULL AND code_record.expires_at < NOW() THEN
        RAISE LOG 'activate_secret_code: Code % expiré depuis %', p_code, code_record.expires_at;
        RETURN json_build_object(
            'success', false,
            'error', 'Ce code secret a expiré'
        );
    END IF;
    
    -- 4. Calculer la date d'expiration pour l'utilisateur
    IF code_record.type = 'lifetime' THEN
        expires_at_value := NULL; -- Pas d'expiration pour les codes à vie
        RAISE LOG 'activate_secret_code: Code à vie - pas d''expiration';
    ELSE
        expires_at_value := NOW() + INTERVAL '30 days'; -- 30 jours pour les codes mensuels
        RAISE LOG 'activate_secret_code: Code mensuel - expiration: %', expires_at_value;
    END IF;
    
    -- 5. Vérifier si l'utilisateur a déjà un code actif
    SELECT usc.*, sc.type as secret_type INTO existing_code_record
    FROM user_secret_codes usc
    JOIN secret_codes sc ON usc.code_id = sc.id
    WHERE usc.user_id = p_user_id 
    AND (usc.expires_at IS NULL OR usc.expires_at > NOW())
    AND sc.is_active = true
    ORDER BY usc.activated_at DESC
    LIMIT 1;
    
    IF FOUND THEN
        RAISE LOG 'activate_secret_code: Code existant trouvé - type: %', existing_code_record.secret_type;
        
        -- Si l'utilisateur a déjà un code à vie, refuser
        IF existing_code_record.secret_type = 'lifetime' THEN
            RAISE LOG 'activate_secret_code: Utilisateur a déjà un code à vie';
            RETURN json_build_object(
                'success', false,
                'error', 'Vous avez déjà un code secret à vie actif'
            );
        END IF;
        
        -- Si le nouveau code est à vie, remplacer l'ancien
        IF code_record.type = 'lifetime' THEN
            RAISE LOG 'activate_secret_code: Remplacement par code à vie';
            DELETE FROM user_secret_codes WHERE user_id = p_user_id;
        ELSE
            -- Si les deux sont mensuels, refuser
            RAISE LOG 'activate_secret_code: Utilisateur a déjà un code mensuel actif';
            RETURN json_build_object(
                'success', false,
                'error', 'Vous avez déjà un code secret mensuel actif. Attendez son expiration ou utilisez un code à vie.'
            );
        END IF;
    END IF;
    
    -- 6. Activer le code pour l'utilisateur
    INSERT INTO user_secret_codes (user_id, code_id, expires_at)
    VALUES (p_user_id, code_record.id, expires_at_value);
    
    RAISE LOG 'activate_secret_code: Code activé pour user % - expires_at: %', p_user_id, expires_at_value;
    
    -- 7. Incrémenter le compteur d'utilisations
    UPDATE secret_codes 
    SET current_uses = current_uses + 1
    WHERE id = code_record.id;
    
    RAISE LOG 'activate_secret_code: Compteur mis à jour - nouvelles utilisations: %', code_record.current_uses + 1;
    
    -- 8. Retourner le succès
    RETURN json_build_object(
        'success', true,
        'message', CASE 
            WHEN code_record.type = 'lifetime' THEN 'Code à vie activé avec succès !'
            ELSE 'Code mensuel activé avec succès !'
        END,
        'type', code_record.type,
        'expires_at', expires_at_value
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'activate_secret_code: ERREUR - %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur interne lors de l''activation du code: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;