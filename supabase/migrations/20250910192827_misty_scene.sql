/*
  # Fix RLS policy for responses table

  1. Security
    - Update the INSERT policy for responses to properly check if form is published
    - Add better error handling for the policy check
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can submit responses to published forms" ON responses;

-- Create a new, more robust policy
CREATE POLICY "Anyone can submit responses to published forms"
  ON responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM forms 
      WHERE forms.id = responses.form_id 
        AND forms.is_published = true
    )
  );

-- Also ensure we have a policy for reading responses (for form owners)
DROP POLICY IF EXISTS "Form owners can view responses to their forms" ON responses;

CREATE POLICY "Form owners can view responses to their forms"
  ON responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM forms 
      WHERE forms.id = responses.form_id 
        AND forms.user_id = auth.uid()
    )
  );

-- Policy for deleting responses (for form owners)
DROP POLICY IF EXISTS "Form owners can delete responses to their forms" ON responses;

CREATE POLICY "Form owners can delete responses to their forms"
  ON responses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM forms 
      WHERE forms.id = responses.form_id 
        AND forms.user_id = auth.uid()
    )
  );