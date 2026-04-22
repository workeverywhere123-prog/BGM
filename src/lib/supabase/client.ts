/**
 * Supabase Browser Client (Client Components only).
 *
 * Use inside 'use client' components. Reads cookies set by the server helpers
 * via @supabase/ssr so a single session is shared across server + browser.
 */

import { createBrowserClient } from '@supabase/ssr';
import { env } from '../env';

export function createSupabaseBrowserClient() {
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
