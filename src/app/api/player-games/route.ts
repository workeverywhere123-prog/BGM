import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const body = await req.json();

    const { name, name_en, boardlife_id, boardlife_url, min_players, max_players, is_available, note, genre } = body;
    let { thumbnail_url } = body;
    if (!name) return NextResponse.json({ error: '게임 이름을 입력해주세요' }, { status: 400 });

    // thumbnail_url이 없고 boardlife_id가 있으면 자동 찾기
    if (!thumbnail_url && boardlife_id) {
      // 1) 기존 player_games에서 같은 boardlife_id의 thumbnail 사용
      const { data: existing } = await supabase
        .from('player_games')
        .select('thumbnail_url')
        .eq('boardlife_id', boardlife_id)
        .not('thumbnail_url', 'is', null)
        .limit(1)
        .maybeSingle();
      if (existing?.thumbnail_url) {
        thumbnail_url = existing.thumbnail_url;
      } else {
        // 2) Supabase Storage에서 게임 이미지 확인
        const svc = createSupabaseServiceClient();
        const exts = ['jpg', 'png', 'webp'];
        for (const ext of exts) {
          const { data: pub } = svc.storage.from('game-images').getPublicUrl(`boardlife/${boardlife_id}.${ext}`);
          if (pub?.publicUrl) {
            // HEAD request to check existence
            try {
              const res = await fetch(pub.publicUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
              if (res.ok) { thumbnail_url = pub.publicUrl; break; }
            } catch { /* continue */ }
          }
        }
      }
    }

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
      genre: genre || null,
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
    const { id, is_available, note, genre } = await req.json();

    const { error } = await supabase.from('player_games')
      .update({ is_available, note: note || null, genre: genre ?? undefined })
      .eq('id', id)
      .eq('player_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
