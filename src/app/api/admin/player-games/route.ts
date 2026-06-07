/**
 * Admin-only player_games CRUD — no player_id restriction
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const user = await requireSessionUser();
  if (!user.is_admin) throw new Error('권한 없음');
  const supabase = await createSupabaseServerClient();
  return { user, supabase };
}

/** GET /api/admin/player-games — 전체 목록 */
export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from('player_games')
      .select('*, players(id, nickname, username)')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}

/** PATCH /api/admin/player-games — 수정 (player_id 제한 없음) */
export async function PATCH(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const body = await req.json();
    const { id, is_available, note, genre, name, name_en, min_players, max_players, thumbnail_url, bgg_id } = body;
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (is_available !== undefined) updates.is_available = is_available;
    if (note !== undefined) updates.note = note || null;
    if (genre !== undefined) updates.genre = genre || null;
    if (name !== undefined) updates.name = name;
    if (name_en !== undefined) updates.name_en = name_en || null;
    if (min_players !== undefined) updates.min_players = min_players || null;
    if (max_players !== undefined) updates.max_players = max_players || null;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url || null;
    if (bgg_id !== undefined) updates.bgg_id = bgg_id || null;

    const { error } = await supabase.from('player_games').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}

/** DELETE /api/admin/player-games — 삭제 (player_id 제한 없음) */
export async function DELETE(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

    const { error } = await supabase.from('player_games').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}
