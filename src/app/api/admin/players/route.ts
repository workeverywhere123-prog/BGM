import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireSessionUser } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (!user.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    const supabase = await createSupabaseServerClient();

    const body = await req.json();
    const { id, is_admin, discord_id } = body;
    const update: Record<string, unknown> = {};
    if (is_admin !== undefined) update.is_admin = is_admin;
    if (discord_id !== undefined) update.discord_id = discord_id;
    const { error } = await supabase.from('players').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}
