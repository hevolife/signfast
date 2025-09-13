/*
  # Fix affiliate programs RLS policy

  1. Security
    - Add missing INSERT policy for affiliate_programs table
    - Allow authenticated users to create their own affiliate programs
    - Ensure users can only create programs for themselves

  2. Changes
    - Add INSERT policy that allows users to create affiliate programs where user_id matches auth.uid()
*/

-- Add INSERT policy for affiliate_programs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'affiliate_programs' 
    AND policyname = 'Users can create own affiliate program'
  ) THEN
    CREATE POLICY "Users can create own affiliate program"
      ON affiliate_programs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;