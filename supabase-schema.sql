-- ==============================================================================
-- NEXUSVERSE 2K26 - SUPABASE PRODUCTION DATABASE SCHEMA
-- ==============================================================================
-- Run this complete script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.registrations (
  reg_id TEXT PRIMARY KEY,
  payment_id TEXT DEFAULT '',
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  college TEXT DEFAULT '',
  class_name TEXT DEFAULT '',
  section TEXT DEFAULT '',
  dept TEXT DEFAULT '',
  year TEXT DEFAULT '',
  roll TEXT NOT NULL,
  is_ieee_member BOOLEAN DEFAULT false,
  ieee_id TEXT DEFAULT '',
  event_ids JSONB DEFAULT '[]'::jsonb,
  team_details JSONB DEFAULT '{}'::jsonb,
  total_paid NUMERIC(10, 2) DEFAULT 0,
  promo_code TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rapid participant search and ticket pass verification
CREATE INDEX IF NOT EXISTS idx_registrations_roll ON public.registrations(roll);
CREATE INDEX IF NOT EXISTS idx_registrations_reg_id ON public.registrations(reg_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);

-- 2. PORTAL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.portal_settings (
  id TEXT PRIMARY KEY DEFAULT 'current',
  is_reg_closed BOOLEAN DEFAULT false,
  closed_message TEXT DEFAULT 'Registration is currently closed. For spot entries or urgent queries, contact the IEEE-SB desk.',
  admin_password TEXT DEFAULT 'katta@2005',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure column exists if table was already created
ALTER TABLE public.portal_settings ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT 'katta@2005';
ALTER TABLE public.portal_settings ADD COLUMN IF NOT EXISTS total_slots_limit INTEGER DEFAULT 0;
ALTER TABLE public.portal_settings ADD COLUMN IF NOT EXISTS ieee_slots_limit INTEGER DEFAULT 0;
ALTER TABLE public.portal_settings ADD COLUMN IF NOT EXISTS non_ieee_slots_limit INTEGER DEFAULT 0;

-- Seed default settings row if it doesn't exist
INSERT INTO public.portal_settings (id, is_reg_closed, closed_message)
VALUES (
  'current',
  false,
  'Registration is currently closed. For inquiries or spot availability, contact the IEEE-SB desk.'
)
ON CONFLICT (id) DO NOTHING;

-- 3. GALLERY PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT DEFAULT 'Symposium Memory',
  category TEXT DEFAULT 'Symposium Highlights',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial symposium gallery showcase photos
INSERT INTO public.gallery_photos (id, url, title, category, uploaded_at)
VALUES 
  ('photo-1', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80', 'Inaugural Keynote & Tech Symposium Hall', 'Symposium Highlights', NOW()),
  ('photo-2', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80', 'Coding Hackathon & Cyber CTF Arena', 'Technical Events', NOW()),
  ('photo-3', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80', 'Project Expo Prototype Demonstrations', 'Expo & Projects', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. PARTICIPANT USERS TABLE (Student accounts for Google, username/email + password)
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

CREATE INDEX IF NOT EXISTS idx_participant_users_email ON public.participant_users(email);
CREATE INDEX IF NOT EXISTS idx_participant_users_username ON public.participant_users(username);
CREATE INDEX IF NOT EXISTS idx_participant_users_roll ON public.participant_users(roll);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_users ENABLE ROW LEVEL SECURITY;

-- PARTICIPANT USERS POLICIES:
DROP POLICY IF EXISTS "Public can manage participant users" ON public.participant_users;
CREATE POLICY "Public can manage participant users" 
  ON public.participant_users FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- REGISTRATIONS POLICIES:
-- Allow anyone to lookup tickets and registrations
DROP POLICY IF EXISTS "Public can view registrations" ON public.registrations;
CREATE POLICY "Public can view registrations" 
  ON public.registrations FOR SELECT 
  TO public 
  USING (true);

-- Allow students to insert new registrations
DROP POLICY IF EXISTS "Public can register" ON public.registrations;
CREATE POLICY "Public can register" 
  ON public.registrations FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Allow updating registrations (for payment confirmation or admin edits)
DROP POLICY IF EXISTS "Public can update registrations" ON public.registrations;
CREATE POLICY "Public can update registrations" 
  ON public.registrations FOR UPDATE 
  TO public 
  USING (true)
  WITH CHECK (true);

-- Allow admin deletions
DROP POLICY IF EXISTS "Public can delete registrations" ON public.registrations;
CREATE POLICY "Public can delete registrations" 
  ON public.registrations FOR DELETE 
  TO public 
  USING (true);

-- PORTAL SETTINGS POLICIES:
-- Allow public to read portal status (open/closed)
DROP POLICY IF EXISTS "Public can read portal settings" ON public.portal_settings;
CREATE POLICY "Public can read portal settings" 
  ON public.portal_settings FOR SELECT 
  TO public 
  USING (true);

-- Allow updating portal settings
DROP POLICY IF EXISTS "Public can update portal settings" ON public.portal_settings;
CREATE POLICY "Public can update portal settings" 
  ON public.portal_settings FOR ALL 
  TO public 
  USING (true);

-- GALLERY PHOTOS POLICIES:
-- Allow public to view gallery photos
DROP POLICY IF EXISTS "Public can view gallery photos" ON public.gallery_photos;
CREATE POLICY "Public can view gallery photos" 
  ON public.gallery_photos FOR SELECT 
  TO public 
  USING (true);

-- Allow inserting gallery photos
DROP POLICY IF EXISTS "Public can upload gallery photos" ON public.gallery_photos;
CREATE POLICY "Public can upload gallery photos" 
  ON public.gallery_photos FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Allow deleting gallery photos
DROP POLICY IF EXISTS "Public can delete gallery photos" ON public.gallery_photos;
CREATE POLICY "Public can delete gallery photos" 
  ON public.gallery_photos FOR DELETE 
  TO public 
  USING (true);

-- ==============================================================================
-- 5. REALTIME (OPTIONAL): Enable Supabase Realtime for live organizer updates
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_settings;
