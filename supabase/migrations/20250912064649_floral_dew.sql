/*
  # Add INSERT policy for secret codes

  1. Security Changes
    - Add RLS policy to allow authenticated users to insert secret codes
    - This enables the admin dashboard to create new secret codes

  2. Policy Details
    - Allows INSERT operations for authenticated users on secret_codes table
    - Required for the admin functionality to work properly
*/

CREATE POLICY "Allow authenticated users to insert secret codes"
  ON secret_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);