/*
  # Fix PDF storage RLS policy for public forms

  1. Security Updates
    - Add policy to allow anonymous users to insert PDFs for public forms
    - Ensure form owners can still manage their PDFs
    - Maintain security while allowing public form submissions

  2. Performance
    - Add index for better query performance
    - Optimize RLS policies
*/

-- Supprimer les anciennes politiques qui pourraient causer des conflits
DROP POLICY IF EXISTS "Users can create their own PDFs" ON pdf_storage;
DROP POLICY IF EXISTS "Users can read their own PDFs" ON pdf_storage;
DROP POLICY IF EXISTS "Users can update their own PDFs" ON pdf_storage;
DROP POLICY IF EXISTS "Users can delete their own PDFs" ON pdf_storage;

-- Nouvelle politique pour permettre l'insertion depuis les formulaires publics
CREATE POLICY "Allow PDF creation for form owners"
  ON pdf_storage
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Vérifier que le user_id correspond au propriétaire d'un formulaire publié
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.user_id = pdf_storage.user_id 
      AND forms.is_published = true
    )
  );

-- Politique pour que les propriétaires puissent lire leurs PDFs
CREATE POLICY "Form owners can read their PDFs"
  ON pdf_storage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour que les propriétaires puissent mettre à jour leurs PDFs
CREATE POLICY "Form owners can update their PDFs"
  ON pdf_storage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour que les propriétaires puissent supprimer leurs PDFs
CREATE POLICY "Form owners can delete their PDFs"
  ON pdf_storage
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ajouter un index pour améliorer les performances des requêtes RLS
CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_id_created_at 
ON pdf_storage (user_id, created_at DESC);

-- Ajouter un index pour les requêtes de vérification des formulaires
CREATE INDEX IF NOT EXISTS idx_forms_user_id_published 
ON forms (user_id, is_published) 
WHERE is_published = true;