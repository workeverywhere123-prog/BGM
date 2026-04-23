import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireSessionUser } from '@/lib/session';

async function requireAdmin() {
  const user = await requireSessionUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('players').select('is_admin').eq('id', user.id).maybeSingle();
  if (!data?.is_admin) throw new Error('권한 없음');
  return { user, supabase };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await req.json();
    const { number, held_at, note, status } = body;
    if (!number || !held_at) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });

    // league_id: 첫 번째 리그 사용 (단일 리그 운영 기준)
    const { data: league } = await supabase.from('leagues').select('id').eq('owner_id', user.id).maybeSingle()
      ?? await supabase.from('leagues').select('id').limit(1).maybeSingle();

    if (!league) return NextResponse.json({ error: '리그가 없습니다. 먼저 리그를 생성하세요.' }, { status: 400 });

    const { data, error } = await supabase.from('meetings').insert({
      league_id: league.id, number: parseInt(number), held_at, note: note || null, status,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}
