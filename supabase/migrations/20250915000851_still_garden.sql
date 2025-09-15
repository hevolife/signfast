/*
  # Fix affiliate programs INSERT policy

  1. Security Changes
    - Add missing INSERT policy for affiliate_programs table
    - Allow authenticated users to create their own affiliate programs
    - Ensure users can only insert programs where user_id matches their auth.uid()

  2. Policy Details
    - Policy name: "Users can insert own affiliate program"
    - Target: INSERT operations
    - Role: authenticated users
    - Condition: user_id must match auth.uid()
*/

-- Add INSERT policy for affiliate_programs table
CREATE POLICY "Users can insert own affiliate program"
  ON affiliate_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);