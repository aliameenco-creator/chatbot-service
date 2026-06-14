-- Run this entire block in Supabase → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS clients (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  system_prompt  TEXT NOT NULL,
  allowed_domain TEXT NOT NULL,
  monthly_limit  INTEGER NOT NULL DEFAULT 2000,
  messages_used  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  TEXT REFERENCES clients(id) ON DELETE SET NULL,
  message    TEXT,
  reply      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security so the service role key can read/write freely
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs    DISABLE ROW LEVEL SECURITY;
-- just testing