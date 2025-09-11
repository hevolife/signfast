/*
  # Fix RLS policy for responses table - Simple approach

  1. Drop existing policies
  2. Create simple, working policies
  3. Ensure anonymous users can insert responses to published forms
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can submit responses to published forms" ON responses;
DROP POLICY IF EXISTS "Form owners can view responses to their forms" ON responses;
DROP POLICY IF EXISTS "Form owners can delete responses to their forms" ON responses;

-- Create simple policy for inserting responses
CREATE POLICY "Allow insert responses to published forms" ON responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.is_published = true
    )
  );

-- Create policy for form owners to view responses
CREATE POLICY "Form owners can view responses" ON responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Create policy for form owners to delete responses
CREATE POLICY "Form owners can delete responses" ON responses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.user_id = auth.uid()
    )
  );