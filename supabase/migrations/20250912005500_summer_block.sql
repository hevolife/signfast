/*
  # Fix forms table RLS policy for INSERT operations

  1. Security Changes
    - Drop existing INSERT policy that may be too restrictive
    - Create new INSERT policy allowing authenticated users to create forms
    - Ensure policy allows both normal users and admin impersonation

  This migration fixes the RLS violation error when creating new forms.
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create their own forms" ON forms;

-- Create new INSERT policy that allows authenticated users to create forms
CREATE POLICY "Users can create their own forms" ON forms
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND (
        (user_profiles.first_name = 'Super' AND user_profiles.last_name = 'Admin') 
        OR user_profiles.company_name = 'Admin'
      )
    )
  );