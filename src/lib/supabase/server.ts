/**
 * Supabase Server Client — for Server Components, Server Actions,
 * and Route Handlers. Uses the request's cookie jar so RLS is enforced
 * with the signed-in user's JWT.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '../env';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // Server Components cannot set cookies — ignore. Middleware/Server
          // Actions will handle cookie writes.
        }
      },
    },
  });
}
