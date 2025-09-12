/*
  # Fix forms RLS policy for impersonation

  1. Security Updates
    - Update forms RLS policies to handle impersonation correctly
    - Ensure authenticated users can create forms with proper user_id
    
  2. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy that allows authenticated users to create forms
    - Ensure the policy works with both normal auth and impersonation
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own forms" ON forms;

-- Create new INSERT policy that handles impersonation
CREATE POLICY "Users can create their own forms"
  ON forms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user_id matches the authenticated user
    user_id = auth.uid()
    OR
    -- Allow if user is admin (for impersonation)
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (
        first_name = 'Super' AND last_name = 'Admin'
        OR company_name = 'Admin'
      )
    )
  );