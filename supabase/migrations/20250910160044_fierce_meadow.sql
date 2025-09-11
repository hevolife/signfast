/*
  # Create forms and responses tables

  1. New Tables
    - `forms`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, optional)
      - `fields` (jsonb, stores form field configuration)
      - `settings` (jsonb, stores form settings)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `is_published` (boolean, default false)
      - `password` (text, optional for password protection)
    
    - `responses`
      - `id` (uuid, primary key)
      - `form_id` (uuid, foreign key to forms)
      - `data` (jsonb, stores response data)
      - `created_at` (timestamp)
      - `ip_address` (text, optional)
      - `user_agent` (text, optional)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own forms
    - Add policies for public form submission
    - Add policies for form owners to view responses

  3. Indexes
    - Add indexes for better query performance
*/

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  fields jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT false,
  password text DEFAULT NULL
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  ip_address text DEFAULT NULL,
  user_agent text DEFAULT NULL
);

-- Enable Row Level Security
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Create policies for forms table
CREATE POLICY "Users can view their own forms"
  ON forms
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forms"
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

CREATE POLICY "Anyone can view published forms"
  ON forms
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Create policies for responses table
CREATE POLICY "Form owners can view responses to their forms"
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

CREATE POLICY "Form owners can delete responses to their forms"
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_is_published ON forms(is_published);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on forms table
CREATE TRIGGER update_forms_updated_at 
    BEFORE UPDATE ON forms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();