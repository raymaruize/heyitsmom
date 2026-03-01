-- Add invite_code column to profiles table for student invite codes

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE 
CHECK (invite_code ~ '^\d{6}$' OR invite_code IS NULL);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);

-- Update existing student without invite_code to use 226257
UPDATE profiles 
SET invite_code = '226257' 
WHERE id = (
  SELECT id 
  FROM profiles 
  WHERE role = 'student' 
  AND invite_code IS NULL 
  LIMIT 1
);

-- Verify
SELECT id, display_name, role, invite_code 
FROM profiles 
WHERE role = 'student';
