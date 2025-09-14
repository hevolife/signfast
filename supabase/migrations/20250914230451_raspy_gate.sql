/*
  # Add user_name column to pdf_storage table

  1. Schema Changes
    - Add `user_name` column to `pdf_storage` table
    - Column stores extracted user name from form data
    - Optional field with empty string default

  2. Performance
    - Add index on user_name for search optimization
    - No impact on existing data (nullable with default)

  3. Notes
    - This column will store the extracted name/surname from form submissions
    - Improves user experience by showing person names instead of form titles
    - Backward compatible with existing PDFs
*/

-- Add user_name column to pdf_storage table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_storage' AND column_name = 'user_name'
  ) THEN
    ALTER TABLE pdf_storage ADD COLUMN user_name text DEFAULT '' NOT NULL;
  END IF;
END $$;

-- Add index for performance on user_name searches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'pdf_storage' AND indexname = 'idx_pdf_storage_user_name'
  ) THEN
    CREATE INDEX idx_pdf_storage_user_name ON pdf_storage(user_name);
  END IF;
END $$;

-- Add composite index for user_id + user_name for optimized queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'pdf_storage' AND indexname = 'idx_pdf_storage_user_id_user_name'
  ) THEN
    CREATE INDEX idx_pdf_storage_user_id_user_name ON pdf_storage(user_id, user_name);
  END IF;
END $$;