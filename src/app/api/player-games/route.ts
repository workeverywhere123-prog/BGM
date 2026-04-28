import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const body = await req.json();

    const { name, name_en, boardlife_id, boardlife_url, thumbnail_url, min_players, max_players, is_available, note } = body;
    if (!name) return NextResponse.json({ error: '게임 이름을 입력해주세요' }, { status: 400 });

    const { data, error } = await supabase.from('player_games').insert({
      player_id: user.id,
      name,
      name_en: name_en || null,
      boardlife_id: boardlife_id || null,
      boardlife_url: boardlife_url || null,
      thumbnail_url: thumbnail_url || null,
      min_players: min_players || null,
      max_players: max_players || null,
      is_available: is_available ?? true,
      note: note || null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { id } = await req.json();

    const { error } = await supabase.from('player_games')
      .delete()
      .eq('id', id)
      .eq('player_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { id, is_available, note } = await req.json();

    const { error } = await supabase.from('player_games')
      .update({ is_available, note: note || null })
      .eq('id', id)
      .eq('player_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
