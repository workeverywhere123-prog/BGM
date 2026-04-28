/**
 * Convenience helpers for reading the current session on the server.
 * Cookies/JWTs are managed by @supabase/ssr — do not roll your own here.
 */

import { createSupabaseServerClient } from './supabase/server';

export interface SessionUser {
  id: string;
  username: string;
  nickname: string;
  is_admin: boolean;
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

  const { data: profile } = await supabase
    .from('players')
    .select('username, nickname, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  const username = profile?.username ?? user.email.split('@')[0];

  return {
    id: user.id,
    username,
    nickname: profile?.nickname ?? username,
    is_admin: profile?.is_admin ?? false,
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
