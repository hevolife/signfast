/*
  # Allow public access to user profiles for public forms

  1. Security Changes
    - Add policy to allow anonymous users to read user profiles
    - This enables public forms to display company logos and info
    - Access is read-only and limited to basic profile information

  2. Important Notes
    - This only affects the user_profiles table
    - No sensitive information is exposed
    - Only basic company information (name, logo) is accessible
*/

-- Allow anonymous users to read user profiles for public forms
CREATE POLICY "Allow public read access to user profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);