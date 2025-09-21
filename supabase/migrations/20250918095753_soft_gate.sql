/*
  # Add Two-Factor Authentication to Profiles

  1. Changes
    - Add `two_factor_enabled` column to `profiles` table
    - Set default value to `false` for existing users
    - Update existing profiles to have 2FA disabled by default

  2. Security
    - No RLS changes needed as existing policies cover the new column
*/

-- Add two_factor_enabled column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN two_factor_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Update existing profiles to have 2FA disabled by default
UPDATE profiles SET two_factor_enabled = false WHERE two_factor_enabled IS NULL;