/*
  # Fix PDF Templates RLS Policies

  1. Security Changes
    - Drop all existing policies for pdf_templates table
    - Create new comprehensive policies for all operations
    - Ensure authenticated users can manage their own templates
    - Allow public read access to public templates

  2. Policy Details
    - INSERT: Users can create templates with their own user_id
    - SELECT: Users can read their own templates + public templates
    - UPDATE: Users can update their own templates
    - DELETE: Users can delete their own templates
*/

-- Drop all existing policies for pdf_templates
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leurs templates" ON pdf_templates;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs templates" ON pdf_templates;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs templates" ON pdf_templates;
DROP POLICY IF EXISTS "Tout le monde peut lire les templates publics" ON pdf_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON pdf_templates;

-- Ensure RLS is enabled
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
CREATE POLICY "Users can insert their own templates"
  ON pdf_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read public templates"
  ON pdf_templates
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Users can update their own templates"
  ON pdf_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON pdf_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);