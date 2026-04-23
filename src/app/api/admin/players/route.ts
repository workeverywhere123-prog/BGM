import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireSessionUser } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { data: me } = await supabase.from('players').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me?.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

    const { id, is_admin } = await req.json();
    const { error } = await supabase.from('players').update({ is_admin }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}
