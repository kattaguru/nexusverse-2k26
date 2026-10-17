-- ==============================================================================
-- NEXUSVERSE 2K26: PARTICIPANT USERS TABLE CREATION
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query:
-- https://supabase.com/dashboard/project/nfkyzozrreardklsoehb/sql/new
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.participant_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  college TEXT DEFAULT '',
  roll TEXT DEFAULT '',
  branch TEXT DEFAULT '',
  year TEXT DEFAULT '',
  is_ieee_member BOOLEAN DEFAULT false,
  ieee_id TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  auth_provider TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_participant_users_email ON public.participant_users(email);
CREATE INDEX IF NOT EXISTS idx_participant_users_username ON public.participant_users(username);
CREATE INDEX IF NOT EXISTS idx_participant_users_roll ON public.participant_users(roll);

-- Enable Row Level Security (RLS)
ALTER TABLE public.participant_users ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (for participant registration, login, and profile updates)
DROP POLICY IF EXISTS "Public can manage participant users" ON public.participant_users;
CREATE POLICY "Public can manage participant users" 
  ON public.participant_users FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);
