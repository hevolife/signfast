/*
  # Configuration automatique du programme d'affiliation

  1. Fonctions
    - `create_affiliate_program_for_user()` : Crée automatiquement un programme d'affiliation
    - `generate_unique_affiliate_code()` : Génère un code d'affiliation unique
  
  2. Triggers
    - Trigger automatique sur insertion dans `user_profiles`
    - Création du programme d'affiliation dès qu'un profil est créé
  
  3. Sécurité
    - Vérifications d'unicité des codes
    - Gestion des erreurs avec rollback automatique
*/

-- Fonction pour générer un code d'affiliation unique
CREATE OR REPLACE FUNCTION generate_unique_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Générer un code de 8 caractères alphanumériques
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Vérifier si le code existe déjà
    SELECT EXISTS(
      SELECT 1 FROM affiliate_programs WHERE affiliate_code = new_code
    ) INTO code_exists;
    
    -- Si le code n'existe pas, on peut l'utiliser
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un programme d'affiliation
CREATE OR REPLACE FUNCTION create_affiliate_program_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_affiliate_code TEXT;
BEGIN
  -- Générer un code d'affiliation unique
  new_affiliate_code := generate_unique_affiliate_code();
  
  -- Créer le programme d'affiliation
  INSERT INTO affiliate_programs (
    user_id,
    affiliate_code,
    commission_rate,
    total_referrals,
    total_earnings,
    monthly_earnings,
    is_active
  ) VALUES (
    NEW.user_id,
    new_affiliate_code,
    5.0, -- 5% de commission par défaut
    0,
    0.0,
    0.0,
    true
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas empêcher la création du profil
    RAISE WARNING 'Erreur création programme affiliation pour user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS auto_create_affiliate_program ON user_profiles;

-- Créer le trigger pour auto-création du programme d'affiliation
CREATE TRIGGER auto_create_affiliate_program
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_affiliate_program_for_user();

-- Créer des programmes d'affiliation pour les utilisateurs existants qui n'en ont pas
DO $$
DECLARE
  user_record RECORD;
  new_affiliate_code TEXT;
BEGIN
  -- Pour chaque utilisateur qui a un profil mais pas de programme d'affiliation
  FOR user_record IN 
    SELECT up.user_id 
    FROM user_profiles up
    LEFT JOIN affiliate_programs ap ON up.user_id = ap.user_id
    WHERE ap.user_id IS NULL
  LOOP
    BEGIN
      -- Générer un code unique
      new_affiliate_code := generate_unique_affiliate_code();
      
      -- Créer le programme
      INSERT INTO affiliate_programs (
        user_id,
        affiliate_code,
        commission_rate,
        total_referrals,
        total_earnings,
        monthly_earnings,
        is_active
      ) VALUES (
        user_record.user_id,
        new_affiliate_code,
        5.0,
        0,
        0.0,
        0.0,
        true
      );
      
      RAISE NOTICE 'Programme d''affiliation créé pour user %: %', user_record.user_id, new_affiliate_code;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erreur création programme pour user %: %', user_record.user_id, SQLERRM;
        CONTINUE;
    END;
  END LOOP;
END $$;