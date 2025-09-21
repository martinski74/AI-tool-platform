/*
  # Fix profiles and trigger issues

  1. Create missing profiles for existing users
  2. Fix RLS policies to allow profile creation
  3. Ensure trigger function exists and works properly
  4. Set up proper 2FA settings
*/

-- First, let's check and fix the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, two_factor_enabled)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'frontend'),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Temporarily disable RLS to insert missing profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Insert missing profiles for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through auth.users and create missing profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.profiles (id, email, full_name, role, two_factor_enabled)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', 'User'),
      COALESCE(user_record.raw_user_meta_data->>'role', 'frontend'),
      CASE 
        WHEN user_record.email = 'elena@frontend.local' THEN true
        ELSE false
      END
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Set specific roles and 2FA settings for seed users
UPDATE public.profiles SET 
  full_name = 'Иван Иванов',
  role = 'owner',
  two_factor_enabled = false
WHERE email = 'ivan@admin.local';

UPDATE public.profiles SET 
  full_name = 'Елена Петрова',
  role = 'frontend',
  two_factor_enabled = true
WHERE email = 'elena@frontend.local';

UPDATE public.profiles SET 
  full_name = 'Петър Георгиев',
  role = 'backend',
  two_factor_enabled = false
WHERE email = 'petar@backend.local';

UPDATE public.profiles SET 
  full_name = 'Мария Стоянова',
  role = 'pm',
  two_factor_enabled = false
WHERE email = 'maria@pm.local';

UPDATE public.profiles SET 
  full_name = 'Георги Николов',
  role = 'qa',
  two_factor_enabled = false
WHERE email = 'georgi@qa.local';

UPDATE public.profiles SET 
  full_name = 'Ана Димитрова',
  role = 'designer',
  two_factor_enabled = false
WHERE email = 'ana@design.local';

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Ensure proper RLS policies exist
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read other profiles basic info" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read other profiles basic info"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow system to insert profiles (for the trigger)
CREATE POLICY "System can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);