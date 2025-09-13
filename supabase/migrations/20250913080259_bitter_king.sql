/*
  # Fix responses table permissions for public form submissions

  1. Security Changes
    - Enable RLS on responses table
    - Add policy for anonymous users to insert responses
    - Add policy for form owners to read their form responses
    - Add indexes to improve performance and prevent timeouts

  2. Performance Improvements
    - Add composite index on form_id and created_at
    - Optimize query performance for large datasets
*/

-- Enable RLS on responses table
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can submit responses to published forms" ON responses;
DROP POLICY IF EXISTS "Form owners can read their form responses" ON responses;
DROP POLICY IF EXISTS "Authenticated users can read responses to their forms" ON responses;

-- Allow anonymous users to insert responses to published forms
CREATE POLICY "Anyone can submit responses to published forms"
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

-- Allow form owners to read responses to their forms
CREATE POLICY "Form owners can read their form responses"
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

-- Add performance indexes to prevent timeouts
CREATE INDEX IF NOT EXISTS idx_responses_form_id_created_at 
  ON responses (form_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_responses_insert_performance 
  ON responses (form_id) 
  WHERE created_at > (now() - interval '1 day');

-- Add index on forms for the policy check
CREATE INDEX IF NOT EXISTS idx_forms_published_check 
  ON forms (id, is_published) 
  WHERE is_published = true;