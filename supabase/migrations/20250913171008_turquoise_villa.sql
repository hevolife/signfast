/*
  # Fix affiliate programs foreign key constraint

  1. Changes
    - Drop existing foreign key constraint that references custom users table
    - Add new foreign key constraint that references auth.users table
    - This aligns with Supabase's authentication system where user IDs come from auth.users

  2. Security
    - Maintains existing RLS policies
    - No changes to data access patterns
*/

-- Drop the existing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'affiliate_programs_user_id_fkey' 
    AND table_name = 'affiliate_programs'
  ) THEN
    ALTER TABLE affiliate_programs DROP CONSTRAINT affiliate_programs_user_id_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint referencing auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'affiliate_programs_user_id_auth_fkey' 
    AND table_name = 'affiliate_programs'
  ) THEN
    ALTER TABLE affiliate_programs 
    ADD CONSTRAINT affiliate_programs_user_id_auth_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;