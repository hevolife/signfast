/*
  # Create forms and responses tables

  1. New Tables
    - `forms` - User forms with fields and settings
    - `responses` - Form responses from users
  
  2. Security
    - Enable RLS on forms table
    - Add policies for form access
    - Public access for published forms
  
  3. Indexes
    - Optimize queries for forms and responses
*/

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT ''::text,
  fields jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT false,
  password text,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Enable RLS on forms (responses table doesn't need RLS for public access)
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms
CREATE POLICY "Anyone can view published forms"
  ON forms
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Users can view their own forms"
  ON forms
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable INSERT for authenticated users own forms"
  ON forms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms"
  ON forms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms"
  ON forms
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all forms"
  ON forms
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_is_published ON forms(is_published);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);
CREATE INDEX IF NOT EXISTS idx_forms_user_id_published ON forms(user_id, is_published) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_created_at_desc ON responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_form_id_created_at ON responses(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_form_id_optimized ON responses(form_id);

-- Create function to update forms updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for forms updated_at
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();