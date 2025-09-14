/*
  # Fix PDF Templates RLS Policies

  1. Security Changes
    - Temporarily disable RLS to clean up policies
    - Drop all existing conflicting policies
    - Create new clear INSERT policy for authenticated users
    - Re-enable RLS with proper permissions

  2. Policy Details
    - INSERT: Authenticated users can create templates with their user_id
    - SELECT: Users can view their own templates + public templates
    - UPDATE/DELETE: Users can modify only their own templates
*/

-- Temporarily disable RLS to clean up
ALTER TABLE pdf_templates DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "pdf_templates_delete_policy" ON pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_insert_policy" ON pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_select_own_policy" ON pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_select_public_policy" ON pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_update_policy" ON pdf_templates;
DROP POLICY IF EXISTS "Users can create own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can view own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON pdf_templates;

-- Re-enable RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

-- Create new INSERT policy for authenticated users
CREATE POLICY "Allow authenticated users to insert templates"
  ON pdf_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create SELECT policy for own templates
CREATE POLICY "Allow users to view own templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create SELECT policy for public templates
CREATE POLICY "Allow users to view public templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Create UPDATE policy
CREATE POLICY "Allow users to update own templates"
  ON pdf_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy
CREATE POLICY "Allow users to delete own templates"
  ON pdf_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);