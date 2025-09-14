/*
  # Recreate PDF Templates RLS Policies

  1. Security Changes
    - Drop all existing policies for pdf_templates
    - Create new comprehensive policies for all operations
    - Ensure proper authentication checks

  2. Policy Details
    - INSERT: Authenticated users can create templates with their user_id
    - SELECT: Users can read their own templates + public templates
    - UPDATE: Users can update their own templates
    - DELETE: Users can delete their own templates
*/

-- Disable RLS temporarily to clean up
ALTER TABLE pdf_templates DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can read public templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can read their own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Enable INSERT for authenticated users own templates" ON pdf_templates;
DROP POLICY IF EXISTS "Enable SELECT for users based on user_id" ON pdf_templates;
DROP POLICY IF EXISTS "Enable UPDATE for users based on user_id" ON pdf_templates;
DROP POLICY IF EXISTS "Enable DELETE for users based on user_id" ON pdf_templates;

-- Re-enable RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper authentication
CREATE POLICY "pdf_templates_insert_policy" 
  ON pdf_templates 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pdf_templates_select_own_policy" 
  ON pdf_templates 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "pdf_templates_select_public_policy" 
  ON pdf_templates 
  FOR SELECT 
  TO authenticated 
  USING (is_public = true);

CREATE POLICY "pdf_templates_update_policy" 
  ON pdf_templates 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pdf_templates_delete_policy" 
  ON pdf_templates 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);