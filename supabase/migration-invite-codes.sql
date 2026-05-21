-- Migration: invite_codes table
-- Run in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS invite_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at     timestamptz,
  expires_at  timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- 일반 유저는 클라이언트에서 직접 읽기/쓰기 불가 (service_role만 접근)
CREATE POLICY "no_client_access" ON invite_codes
  FOR ALL TO authenticated USING (false);
