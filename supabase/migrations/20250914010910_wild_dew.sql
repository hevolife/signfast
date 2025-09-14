/*
  # Fix RLS policy for pdf_templates table

  1. Security Updates
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy allowing authenticated users to create their own templates
    - Ensure policy uses auth.uid() correctly for user identification

  2. Changes
    - Allow INSERT operations when auth.uid() = user_id
    - Maintain existing SELECT, UPDATE, DELETE policies
    - Keep public template visibility intact
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leurs templates" ON pdf_templates;

-- Create new INSERT policy that allows authenticated users to create their own templates
CREATE POLICY "Users can create their own templates"
  ON pdf_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure the table has RLS enabled
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;