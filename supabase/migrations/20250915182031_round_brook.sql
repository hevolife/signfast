/*
  # Create PDF system tables

  1. New Tables
    - `pdf_templates` - PDF templates with field positioning
    - `pdf_storage` - Generated PDFs storage
  
  2. Security
    - Enable RLS on both tables
    - Public access for templates linked to published forms
    - User access for their own templates and PDFs
  
  3. Indexes
    - Optimize queries for templates and storage
*/

-- Create pdf_templates table
CREATE TABLE IF NOT EXISTS pdf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT ''::text,
  pdf_content text NOT NULL,
  fields jsonb DEFAULT '[]'::jsonb,
  user_id uuid,
  is_public boolean DEFAULT true,
  linked_form_id uuid,
  pages integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create pdf_storage table
CREATE TABLE IF NOT EXISTS pdf_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  response_id uuid,
  template_name text DEFAULT 'Template simple'::text,
  form_title text NOT NULL,
  form_data jsonb DEFAULT '{}'::jsonb,
  pdf_content text NOT NULL,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid,
  user_name text DEFAULT ''::text,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_storage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_templates
CREATE POLICY "Anonymous users can read public templates"
  ON pdf_templates
  FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Public access to templates linked to published forms"
  ON pdf_templates
  FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true OR 
    linked_form_id IN (
      SELECT id FROM forms WHERE is_published = true
    )
  );

CREATE POLICY "Users can view public templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can view their own templates"
  ON pdf_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON pdf_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "Super admins can manage all pdf_templates"
  ON pdf_templates
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RLS Policies for pdf_storage
CREATE POLICY "Form owners can read their PDFs"
  ON pdf_storage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow PDF creation for form owners"
  ON pdf_storage
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.user_id = pdf_storage.user_id 
      AND forms.is_published = true
    )
  );

CREATE POLICY "Form owners can update their PDFs"
  ON pdf_storage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Form owners can delete their PDFs"
  ON pdf_storage
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all pdf_storage"
  ON pdf_storage
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pdf_templates_user_id ON pdf_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_is_public ON pdf_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_linked_form_id ON pdf_templates(linked_form_id);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_created_at ON pdf_templates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_id ON pdf_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_file_name ON pdf_storage(file_name);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_form_title ON pdf_storage(form_title);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_created_at ON pdf_storage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_id_created_at ON pdf_storage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_name ON pdf_storage(user_name);
CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_id_user_name ON pdf_storage(user_id, user_name);

-- Create functions for PDF system
CREATE OR REPLACE FUNCTION update_pdf_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_pdf_storage_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER update_pdf_templates_updated_at
  BEFORE UPDATE ON pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_templates_updated_at();

CREATE TRIGGER update_pdf_storage_updated_at
  BEFORE UPDATE ON pdf_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_storage_updated_at();