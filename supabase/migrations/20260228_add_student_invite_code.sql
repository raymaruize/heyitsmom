-- Add student invite code support and parent-student linking via invite code

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_invite_code_format_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_invite_code_format_check
      CHECK (invite_code ~ '^\d{6}$' OR invite_code IS NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_invite_code_unique ON profiles(invite_code);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);
