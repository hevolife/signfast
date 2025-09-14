/*
  # Recreate PDF templates table with correct RLS policies

  1. Tables
    - Backup existing data from `pdf_templates`
    - Drop and recreate `pdf_templates` table with proper structure
    - Restore data
    
  2. Security
    - Enable RLS on new table
    - Add correct policies for authenticated users
    - Ensure users can only manage their own templates
*/

-- Backup existing data
CREATE TEMP TABLE pdf_templates_backup AS 
SELECT * FROM pdf_templates;

-- Drop existing table (this will also drop all policies)
DROP TABLE IF EXISTS pdf_templates CASCADE;

-- Recreate table with proper structure
CREATE TABLE pdf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT ''::text,
  pdf_content text NOT NULL,
  fields jsonb DEFAULT '[]'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  linked_form_id uuid,
  pages integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_pdf_templates_user_id ON pdf_templates(user_id);
CREATE INDEX idx_pdf_templates_is_public ON pdf_templates(is_public);
CREATE INDEX idx_pdf_templates_created_at ON pdf_templates(created_at DESC);
CREATE INDEX idx_pdf_templates_linked_form_id ON pdf_templates(linked_form_id);

-- Create RLS policies
CREATE POLICY "Users can insert their own templates"
  ON pdf_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
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

-- Restore data if any existed
INSERT INTO pdf_templates 
SELECT * FROM pdf_templates_backup
WHERE EXISTS (SELECT 1 FROM pdf_templates_backup);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_pdf_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pdf_templates_updated_at
  BEFORE UPDATE ON pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_templates_updated_at();