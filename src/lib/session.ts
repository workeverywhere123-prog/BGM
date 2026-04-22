/**
 * Convenience helpers for reading the current session on the server.
 * Cookies/JWTs are managed by @supabase/ssr — do not roll your own here.
 */

import { createSupabaseServerClient } from './supabase/server';

export interface SessionUser {
  id: string;
  username: string;   // human-readable ID (e.g. "player1")
  nickname: string;   // display name (defaults to username)
}

/**
 * Returns the signed-in user (Player) or null if anonymous.
 * Profile fields are loaded from the `players` table.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  // Enrich from players table. Falls back gracefully before DB is seeded.
  const { data: profile } = await supabase
    .from('players')
    .select('username, nickname')
    .eq('id', user.id)
    .maybeSingle();

  // username = players.username → fallback: extract from fake email (before @)
  const username = profile?.username ?? user.email.split('@')[0];

  return {
    id: user.id,
    username,
    nickname: profile?.nickname ?? username,
  };
}

/** Throws if not signed in — use at the top of protected Server Actions. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}
