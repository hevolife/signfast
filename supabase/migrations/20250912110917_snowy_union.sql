/*
  # Fix PDF Privacy - Users can only see their own PDFs

  1. Security Changes
    - Remove public access policies from pdf_storage table
    - Add proper RLS policies so users only see their own PDFs
    - Add user_id column to pdf_storage table to track ownership
    - Update existing PDFs to link them to their owners

  2. Database Changes
    - Add user_id column to pdf_storage table
    - Create proper foreign key relationship
    - Update RLS policies for proper data isolation

  3. Important Notes
    - This migration ensures complete data privacy
    - Each user will only see their own generated PDFs
    - Existing PDFs will be preserved but may need manual ownership assignment
*/

-- Add user_id column to pdf_storage table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_storage' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE pdf_storage ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pdf_storage_user_id_fkey'
  ) THEN
    ALTER TABLE pdf_storage 
    ADD CONSTRAINT pdf_storage_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing public policies that allow everyone to access PDFs
DROP POLICY IF EXISTS "Tout le monde peut créer des PDFs" ON pdf_storage;
DROP POLICY IF EXISTS "Tout le monde peut lire les PDFs" ON pdf_storage;
DROP POLICY IF EXISTS "Tout le monde peut supprimer des PDFs" ON pdf_storage;

-- Create proper RLS policies for user privacy
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

CREATE POLICY "Users can update their own PDFs"
  ON pdf_storage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDFs"
  ON pdf_storage
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_id ON pdf_storage(user_id);

-- Note: Existing PDFs without user_id will not be visible until manually assigned
-- This is intentional for security - orphaned PDFs should be reviewed manually