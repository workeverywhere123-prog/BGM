import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: league_id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from('league_player_availability')
    .select('player_id, available_date')
    .eq('league_id', league_id)
    .order('available_date');

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: league_id } = await params;
    const user = await requireSessionUser();
    const { date } = await req.json();
    if (!date) return NextResponse.json({ error: '날짜를 입력해주세요' }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('league_player_availability').insert({
      league_id, player_id: user.id, available_date: date,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: league_id } = await params;
    const user = await requireSessionUser();
    const { date } = await req.json();

    const supabase = createSupabaseAdminClient();
    await supabase.from('league_player_availability')
      .delete()
      .eq('league_id', league_id)
      .eq('player_id', user.id)
      .eq('available_date', date);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PATCH: admin assigns scheduled_date to a match
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: league_id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: player } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!player?.is_admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const { match_id, scheduled_date } = await req.json();
    const { error } = await supabase.from('league_matches')
      .update({ scheduled_date: scheduled_date || null })
      .eq('id', match_id)
      .eq('league_id', league_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
