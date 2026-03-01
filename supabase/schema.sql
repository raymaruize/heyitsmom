-- Hey It's Mom - Supabase Database Schema
-- Run this in Supabase SQL Editor to set up the database

------------------------------------------------------------
-- 0. Helper Functions (Must be first!)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION moddatetime() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------
-- 1. Profiles (extends auth.users)
------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent')),
  display_name TEXT NOT NULL DEFAULT '',
  invite_code TEXT UNIQUE CHECK (invite_code ~ '^\\d{6}$' OR invite_code IS NULL),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_invite_code ON profiles(invite_code);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime();

------------------------------------------------------------
-- 2. Parent-Student Links
------------------------------------------------------------
CREATE TABLE parent_student_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_links ON parent_student_links(parent_id);
CREATE INDEX idx_student_links ON parent_student_links(student_id);

------------------------------------------------------------
-- 3. Daily Records
------------------------------------------------------------
CREATE TABLE daily_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  overall_mood TEXT CHECK (overall_mood IN ('excellent', 'good', 'okay', 'bad', 'terrible') OR overall_mood IS NULL),
  daily_comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TRIGGER set_daily_records_updated_at
  BEFORE UPDATE ON daily_records
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime();

CREATE INDEX idx_daily_records_student_date ON daily_records(student_id, date);

------------------------------------------------------------
-- 4. Hourly Entries
------------------------------------------------------------
CREATE TABLE hourly_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  hour INT NOT NULL CHECK (hour >= 8 AND hour <= 23),
  activity_text TEXT DEFAULT '',
  mood TEXT CHECK (mood IN ('excellent', 'good', 'okay', 'bad', 'terrible') OR mood IS NULL),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(daily_record_id, hour)
);

CREATE TRIGGER set_hourly_entries_updated_at
  BEFORE UPDATE ON hourly_entries
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime();

CREATE INDEX idx_hourly_entries_daily_record ON hourly_entries(daily_record_id);

------------------------------------------------------------
-- 5. Food Records
------------------------------------------------------------
CREATE TABLE food_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  selected_items TEXT[] DEFAULT '{}',
  extra_snacks_text TEXT DEFAULT '',
  outside_food_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(daily_record_id)
);

CREATE TRIGGER set_food_records_updated_at
  BEFORE UPDATE ON food_records
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime();

------------------------------------------------------------
-- 6. Parent Messages & Replies
------------------------------------------------------------
CREATE TABLE parent_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_message TEXT NOT NULL,
  student_reply TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(daily_record_id)
);

CREATE TRIGGER set_parent_messages_updated_at
  BEFORE UPDATE ON parent_messages
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime();

CREATE INDEX idx_parent_messages_daily_record ON parent_messages(daily_record_id);
CREATE INDEX idx_parent_messages_parent ON parent_messages(parent_id);

------------------------------------------------------------
-- 7. Cafeteria Menu Cache
------------------------------------------------------------
CREATE TABLE cafeteria_menu_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  location TEXT NOT NULL,
  meal_periods JSONB NOT NULL,
  source_url TEXT DEFAULT 'https://epicuremenus.com/clients/exeter/online',
  fetched_at TIMESTAMPTZ NOT NULL,
  etag_or_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, location)
);

CREATE INDEX idx_menu_cache_date_location ON cafeteria_menu_cache(date, location);
CREATE INDEX idx_menu_cache_fetched_at ON cafeteria_menu_cache(fetched_at);

------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafeteria_menu_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Parent-Student Links: Users can see links involving them
CREATE POLICY "Users see own links"
  ON parent_student_links FOR SELECT
  USING (
    auth.uid() = parent_id OR auth.uid() = student_id
  );

-- Daily Records: Students own; Parents see linked students only
CREATE POLICY "Students own daily records"
  ON daily_records FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Parents see linked student records"
  ON daily_records FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid()
    )
  );

-- Hourly Entries: Students own; Parents read linked student's
CREATE POLICY "Students own hourly entries"
  ON hourly_entries FOR ALL
  USING (
    daily_record_id IN (
      SELECT id FROM daily_records WHERE student_id = auth.uid()
    )
  )
  WITH CHECK (
    daily_record_id IN (
      SELECT id FROM daily_records WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Parents see linked student hourly entries"
  ON hourly_entries FOR SELECT
  USING (
    daily_record_id IN (
      SELECT dr.id FROM daily_records dr
      WHERE dr.student_id IN (
        SELECT student_id FROM parent_student_links
        WHERE parent_id = auth.uid()
      )
    )
  );

-- Food Records: Students own; Parents read linked student's
CREATE POLICY "Students own food records"
  ON food_records FOR ALL
  USING (
    daily_record_id IN (
      SELECT id FROM daily_records WHERE student_id = auth.uid()
    )
  )
  WITH CHECK (
    daily_record_id IN (
      SELECT id FROM daily_records WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Parents see linked student food records"
  ON food_records FOR SELECT
  USING (
    daily_record_id IN (
      SELECT dr.id FROM daily_records dr
      WHERE dr.student_id IN (
        SELECT student_id FROM parent_student_links
        WHERE parent_id = auth.uid()
      )
    )
  );

-- Parent Messages: Parents can create; Both can read; Students can reply
CREATE POLICY "Parents create messages for linked students"
  ON parent_messages FOR INSERT
  WITH CHECK (
    auth.uid() = parent_id
    AND daily_record_id IN (
      SELECT id FROM daily_records dr
      WHERE dr.student_id IN (
        SELECT student_id FROM parent_student_links
        WHERE parent_id = auth.uid()
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM parent_messages
      WHERE daily_record_id = parent_messages.daily_record_id
    )
  );

CREATE POLICY "Users read own messages"
  ON parent_messages FOR SELECT
  USING (
    auth.uid() = parent_id
    OR daily_record_id IN (
      SELECT id FROM daily_records WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Students update only reply"
  ON parent_messages FOR UPDATE
  USING (
    daily_record_id IN (
      SELECT id FROM daily_records WHERE student_id = auth.uid()
    )
  )
  WITH CHECK (
    daily_record_id IN (
      SELECT id FROM daily_records WHERE student_id = auth.uid()
    )
  );



-- Cafeteria Menu Cache: Public read (no auth required for fetching)
CREATE POLICY "Public read menu cache"
  ON cafeteria_menu_cache FOR SELECT
  USING (true);
