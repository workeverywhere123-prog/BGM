/**
 * Convenience helpers for reading the current session on the server.
 * Cookies/JWTs are managed by @supabase/ssr — do not roll your own here.
 */

import { cache } from 'react';
import { createSupabaseServerClient } from './supabase/server';

export interface SessionUser {
  id: string;
  username: string;
  nickname: string;
  is_admin: boolean;
  terms_agreed_at: string | null;
}

/**
 * Returns the signed-in user (Player) or null if anonymous.
 * Profile fields are loaded from the `players` table.
 * Wrapped with React cache() so multiple callers in the same request
 * share a single DB round-trip (auth.getUser + players.select).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const { data: profile } = await supabase
    .from('players')
    .select('username, nickname, is_admin, terms_agreed_at')
    .eq('id', user.id)
    .maybeSingle();

  const username = profile?.username ?? user.email.split('@')[0];

  return {
    id: user.id,
    username,
    nickname: profile?.nickname ?? username,
    is_admin: profile?.is_admin ?? false,
    terms_agreed_at: profile?.terms_agreed_at ?? null,
  };
});

/** Throws if not signed in — use at the top of protected Server Actions. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user;
}
