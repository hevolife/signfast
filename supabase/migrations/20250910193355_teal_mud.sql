/*
  # Fix RLS definitively for responses table

  1. Disable RLS completely on responses table
  2. Create very permissive policies
  3. Ensure anonymous users can insert responses
*/

-- Disable RLS temporarily to clean up
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow anonymous form submissions" ON responses;
DROP POLICY IF EXISTS "Form owners can read responses" ON responses;
DROP POLICY IF EXISTS "Form owners can delete responses" ON responses;
DROP POLICY IF EXISTS "Users can submit to published forms" ON responses;
DROP POLICY IF EXISTS "Anonymous can submit responses" ON responses;

-- Re-enable RLS
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create a single, very permissive policy for inserts
CREATE POLICY "Anyone can submit responses to published forms" ON responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.is_published = true
    )
  );

-- Create policy for form owners to read their responses
CREATE POLICY "Form owners can read their responses" ON responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Create policy for form owners to delete their responses
CREATE POLICY "Form owners can delete their responses" ON responses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = responses.form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Grant explicit permissions to anon role
GRANT INSERT ON responses TO anon;
GRANT SELECT ON responses TO authenticated;
GRANT DELETE ON responses TO authenticated;

-- Also grant permissions on forms table for the policy checks
GRANT SELECT ON forms TO anon;
GRANT SELECT ON forms TO authenticated;