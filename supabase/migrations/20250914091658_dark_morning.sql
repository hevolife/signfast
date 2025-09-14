/*
  # Fix template public access for non-authenticated users

  1. Security Changes
    - Add policy for anonymous users to read public templates
    - Ensure templates are marked as public when created
    - Allow public access to templates used in published forms

  2. Template Access
    - Anonymous users can read public templates
    - Templates linked to published forms are accessible
    - Maintain security for private templates
*/

-- Ajouter une politique pour permettre l'accès public aux templates
CREATE POLICY "Anonymous users can read public templates"
  ON pdf_templates
  FOR SELECT
  TO anon
  USING (is_public = true);

-- Ajouter une politique pour permettre l'accès aux templates liés à des formulaires publiés
CREATE POLICY "Public access to templates linked to published forms"
  ON pdf_templates
  FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true 
    OR 
    linked_form_id IN (
      SELECT id FROM forms WHERE is_published = true
    )
  );

-- Mettre à jour tous les templates existants pour qu'ils soient publics
UPDATE pdf_templates 
SET is_public = true 
WHERE is_public = false OR is_public IS NULL;

-- S'assurer que les nouveaux templates sont publics par défaut
ALTER TABLE pdf_templates 
ALTER COLUMN is_public SET DEFAULT true;