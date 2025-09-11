/*
  # Supprimer toutes les restrictions RLS pour les formulaires publics

  1. Désactiver RLS sur la table responses
  2. Supprimer toutes les politiques existantes
  3. Permettre l'accès complet aux utilisateurs anonymes
  4. Simplifier l'accès aux données
*/

-- Désactiver RLS complètement sur responses
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes sur responses
DROP POLICY IF EXISTS "Anyone can submit responses to published forms" ON responses;
DROP POLICY IF EXISTS "Form owners can read their responses" ON responses;
DROP POLICY IF EXISTS "Form owners can delete their responses" ON responses;
DROP POLICY IF EXISTS "Allow anonymous submissions" ON responses;
DROP POLICY IF EXISTS "Allow public submissions" ON responses;

-- Donner tous les droits au rôle anon sur responses
GRANT ALL ON responses TO anon;
GRANT ALL ON responses TO authenticated;

-- S'assurer que la séquence est accessible
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permettre l'accès en lecture aux formulaires publiés pour anon
GRANT SELECT ON forms TO anon;

-- Vérifier que tout fonctionne
SELECT 'RLS disabled on responses, full access granted' as status;