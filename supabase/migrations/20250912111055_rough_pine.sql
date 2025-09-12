/*
  # Add user_id column to pdf_storage table

  1. Changes
    - Add `user_id` column to `pdf_storage` table
    - Set up foreign key relationship with auth.users
    - Update RLS policies to use user_id for access control
    - Migrate existing data to associate with a default user if needed

  2. Security
    - Enable RLS on `pdf_storage` table
    - Add policies for users to manage their own PDFs only
*/

-- Add user_id column to pdf_storage table
ALTER TABLE pdf_storage 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_id ON pdf_storage(user_id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Tout le monde peut créer des PDFs" ON pdf_storage;
DROP POLICY IF EXISTS "Tout le monde peut lire les PDFs" ON pdf_storage;
DROP POLICY IF EXISTS "Tout le monde peut supprimer des PDFs" ON pdf_storage;

-- Create secure RLS policies
CREATE POLICY "Users can create their own PDFs"
  ON pdf_storage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own PDFs"
  ON pdf_storage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDFs"
  ON pdf_storage
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDFs"
  ON pdf_storage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);