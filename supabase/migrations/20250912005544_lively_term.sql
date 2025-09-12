/*
  # Fix forms table RLS policy for INSERT operations

  1. Security Changes
    - Drop existing INSERT policy that may be too restrictive
    - Create new simple INSERT policy for authenticated users
    - Allow authenticated users to insert forms where user_id matches their auth.uid()

  This should resolve the "new row violates row-level security policy" error
  when creating new forms.
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create their own forms" ON forms;
DROP POLICY IF EXISTS "Users can create own forms" ON forms;

-- Create a simple INSERT policy for authenticated users
CREATE POLICY "Enable INSERT for authenticated users own forms" ON forms
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);