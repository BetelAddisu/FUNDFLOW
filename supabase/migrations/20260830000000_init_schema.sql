-- Supabase Migration: 20260830000000_init_schema.sql
-- Fixes: relation "supabase_migrations.schema_migrations" does not exist

CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT NOT NULL PRIMARY KEY,
    statements TEXT[],
    name TEXT
);

-- 1. Applicant Users Table
CREATE TABLE IF NOT EXISTS applicant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Applications / Sessions Table
CREATE TABLE IF NOT EXISTS applications (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  business_name TEXT,
  language TEXT DEFAULT 'en',
  channel TEXT DEFAULT 'web',
  flat_evidence JSONB DEFAULT '{}'::jsonb,
  gaps JSONB DEFAULT '[]'::jsonb,
  contradictions JSONB DEFAULT '[]'::jsonb,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Application Messages & Uploaded Evidence Table
CREATE TABLE IF NOT EXISTS application_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES applications(session_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT,
  input_type TEXT DEFAULT 'text', -- 'text' | 'voice' | 'photo'
  attachment_name TEXT,
  attachment_url TEXT, -- Base64 Data URL or Supabase Storage URL
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast queries by session and user
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_session_id ON application_messages(session_id);

-- Enable RLS Policies
ALTER TABLE applicant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on applicant_users" ON applicant_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on applicant_users" ON applicant_users FOR ALL USING (true);

CREATE POLICY "Allow public read access on applications" ON applications FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on applications" ON applications FOR ALL USING (true);

CREATE POLICY "Allow public read access on application_messages" ON application_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on application_messages" ON application_messages FOR ALL USING (true);
