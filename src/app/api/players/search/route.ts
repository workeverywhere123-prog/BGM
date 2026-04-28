import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 1) return NextResponse.json([]);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('players')
    .select('id, nickname, username')
    .or(`nickname.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(8);
  return NextResponse.json(data ?? []);
}
