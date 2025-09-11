/*
  # Fix RLS policy for responses table - Final solution

  1. Security Changes
    - Drop existing problematic policies
    - Create simple, working policies for anonymous users
    - Ensure proper permissions for form submissions

  2. Tables affected
    - `responses` table policies updated
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Anonymous users can submit responses to published forms" ON responses;
DROP POLICY IF EXISTS "Users can submit responses to published forms" ON responses;
DROP POLICY IF EXISTS "Form owners can view responses" ON responses;
DROP POLICY IF EXISTS "Form owners can delete responses" ON responses;

-- Create a simple policy that allows anonymous users to insert responses
-- for published forms without complex subqueries
CREATE POLICY "Allow anonymous form submissions"
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

-- Allow form owners to read their form responses
CREATE POLICY "Form owners can read responses"
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

-- Allow form owners to delete responses
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

-- Ensure RLS is enabled
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role
GRANT INSERT ON responses TO anon;
GRANT SELECT ON forms TO anon;