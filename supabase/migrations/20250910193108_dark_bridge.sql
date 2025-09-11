/*
  # Allow anonymous users to submit form responses

  1. Security Changes
    - Drop existing restrictive policies
    - Create new policy that allows anonymous users to insert responses
    - Keep read/delete policies for authenticated users only
    
  2. Changes
    - Allow anonymous users to submit responses to published forms
    - Maintain security for reading and deleting responses
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow insert responses to published forms" ON responses;
DROP POLICY IF EXISTS "Form owners can view responses" ON responses;
DROP POLICY IF EXISTS "Form owners can delete responses" ON responses;

-- Create new policy that explicitly allows anonymous users to insert
CREATE POLICY "Anonymous users can submit responses to published forms"
  ON responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.is_published = true
    )
  );

-- Keep existing policies for authenticated users to read/delete
CREATE POLICY "Form owners can view responses"
  ON responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Form owners can delete responses"
  ON responses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.user_id = auth.uid()
    )
  );