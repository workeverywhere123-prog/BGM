import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

async function checkAdmin(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data } = await supabase.from('players').select('is_admin').eq('id', userId).single();
  return data?.is_admin === true;
}

/* ── GET: 참가자 목록 ── */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: entries } = await supabase
    .from('raffle_entries')
    .select('player_id, tickets, created_at, players(nickname, username)')
    .eq('raffle_id', id)
    .order('tickets', { ascending: false });

  // Get raffle total_tickets for probability calc
  const total = (entries ?? []).reduce((s, e) => s + e.tickets, 0);

  return NextResponse.json({ entries: entries ?? [], total_tickets: total });
}

/* ── PATCH: 수정 (이름/상품/설명/마감일/상태) ── */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    if (!await checkAdmin(supabase, user.id))
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const body = await req.json() as Record<string, unknown>;
    const allowed = ['name', 'prize', 'description', 'ends_at', 'status'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { error } = await supabase.from('raffles').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/* ── DELETE: 삭제 (drawn 제외) ── */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    if (!await checkAdmin(supabase, user.id))
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const { data: raffle } = await supabase.from('raffles').select('status').eq('id', id).single();
    if (raffle?.status === 'drawn')
      return NextResponse.json({ error: '완료된 추첨은 삭제할 수 없습니다' }, { status: 400 });

    // 참가 기록 먼저 삭제
    await supabase.from('raffle_entries').delete().eq('raffle_id', id);
    await supabase.from('raffles').delete().eq('id', id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
