import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse(null, { status: 401 });

    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', user.id)
      .is('read_at', null);

    return NextResponse.json(
      {
        nickname: user.nickname,
        username: user.username,
        is_admin: user.is_admin ?? false,
        unread_count: count ?? 0,
      },
      // 30초 캐시 + 최대 60초 stale-while-revalidate → 페이지 이동 시 즉시 응답
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    );
  } catch {
    return new NextResponse(null, { status: 401 });
  }
}
