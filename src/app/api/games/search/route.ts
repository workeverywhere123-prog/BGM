import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * 내부 게임 DB 검색
 * 보드라이프 서버가 Cloudflare로 차단될 때 대안으로 사용
 * player_games 테이블에 등록된 게임을 이름으로 검색
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json([]);

  try {
    const supabase = await createSupabaseServerClient();
    // name으로 부분 검색, 중복 boardlife_id 제거 (여러 소유자)
    const { data, error } = await supabase
      .from('player_games')
      .select('boardlife_id, boardlife_url, name, thumbnail_url')
      .ilike('name', `%${q}%`)
      .not('boardlife_id', 'is', null)
      .order('name')
      .limit(20);

    if (error) return NextResponse.json([], { status: 500 });

    // 같은 boardlife_id끼리 중복 제거 (첫 번째만 사용)
    const seen = new Set<string>();
    const unique = (data ?? []).filter(g => {
      if (!g.boardlife_id || seen.has(g.boardlife_id)) return false;
      seen.add(g.boardlife_id);
      return true;
    });

    return NextResponse.json(unique, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
