import type { NextRequest } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  // Skip static assets + Next internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)).*)'],
};
