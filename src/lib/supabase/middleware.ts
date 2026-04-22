/**
 * Supabase session refresh helper for Next.js middleware.
 * Keeps the auth cookie fresh on every request without leaking
 * server-only APIs into the middleware runtime.
 *
 * When Supabase env vars are not yet configured (e.g. first-run developer
 * experience), this helper returns an untouched response so the Welcome
 * screen renders without a runtime crash. The home page separately shows
 * an "Supabase not configured" banner via isSupabaseConfigured().
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env, isSupabaseConfigured } from '../env';

export async function updateSupabaseSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Fail-open during setup: no URL/key → no session to refresh.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Triggers a refresh-token rotation if needed.
  await supabase.auth.getUser();

  return response;
}
