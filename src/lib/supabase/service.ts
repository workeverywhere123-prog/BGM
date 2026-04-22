/**
 * Supabase Service-Role Client.
 *
 * ⚠️  SERVER-ONLY. Bypasses RLS. Never import into a client component,
 * never ship to the browser bundle.
 *
 * Use when a Server Action must perform a privileged operation (e.g.
 * write a RankingSnapshot after Elo recomputation) that the caller's
 * JWT cannot be trusted for.
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

export function createSupabaseServiceClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
