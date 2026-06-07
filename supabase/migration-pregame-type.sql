-- Migration: Pre-game type selection + deathmatch bet agreements
-- Run in Supabase SQL Editor

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS room_game_type text
    CHECK (room_game_type IN ('ranking', 'mafia', 'team', 'coop', 'onevsmany', 'deathmatch')),
  ADD COLUMN IF NOT EXISTS bet_agreements jsonb NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
