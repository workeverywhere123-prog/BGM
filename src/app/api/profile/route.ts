import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const body = await req.json();
    const { nickname, bio, avatar_url, profile_title, banner_color } = body;

    const updates: Record<string, string | null> = {};
    if (nickname !== undefined) updates.nickname = nickname?.trim() || null;
    if (bio !== undefined) updates.bio = bio?.trim() || null;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url?.trim() || null;
    if (profile_title !== undefined) updates.profile_title = profile_title?.trim() || null;
    if (banner_color !== undefined) updates.banner_color = banner_color || null;

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: '변경사항 없음' }, { status: 400 });

    if (updates.nickname !== null && updates.nickname !== undefined) {
      if (updates.nickname.length < 2 || updates.nickname.length > 20)
        return NextResponse.json({ error: '닉네임은 2~20자여야 합니다' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    if (updates.nickname && updates.nickname !== user.nickname) {
      const { data: existing } = await supabase
        .from('players').select('id').eq('nickname', updates.nickname).maybeSingle();
      if (existing) return NextResponse.json({ error: '이미 사용 중인 닉네임입니다' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('players')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, username, nickname, bio, avatar_url, profile_title, banner_color')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
