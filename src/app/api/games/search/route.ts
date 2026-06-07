import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import catalogRaw from '@/data/games-catalog.json';

interface CatalogEntry { boardlife_id: string; name: string }
const CATALOG: CatalogEntry[] = catalogRaw as CatalogEntry[];

/**
 * 게임 검색 API — 두 가지 소스를 병합해 반환
 *
 * 1순위: player_games (DB에 등록된 게임, thumbnail_url 포함)
 * 2순위: games-catalog.json (3500+ 보드라이프 게임 로컬 인덱스)
 *        → thumbnail_url은 없지만 이름으로 검색 가능
 *
 * 보드라이프 서버가 Cloudflare로 차단될 때 대안으로 사용
 */

/** 간단한 이름 매칭 점수 (0~1) */
function matchScore(name: string, q: string): number {
  const n = name.toLowerCase();
  const query = q.toLowerCase();
  if (n === query) return 1;
  if (n.startsWith(query)) return 0.9;
  if (n.includes(query)) return 0.7;
  return 0;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json([]);

  // ── 1. DB 검색 (player_games) ──────────────────────────────────────
  let dbResults: Array<{ boardlife_id: string; boardlife_url: string; name: string; thumbnail_url: string | null }> = [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_games')
      .select('boardlife_id, boardlife_url, name, thumbnail_url')
      .ilike('name', `%${q}%`)
      .not('boardlife_id', 'is', null)
      .order('name')
      .limit(20);

    // 중복 boardlife_id 제거
    const seen = new Set<string>();
    dbResults = (data ?? []).filter(g => {
      if (!g.boardlife_id || seen.has(g.boardlife_id)) return false;
      seen.add(g.boardlife_id);
      return true;
    }) as typeof dbResults;
  } catch { /* DB 실패 시 카탈로그 결과만 반환 */ }

  // ── 2. 카탈로그 검색 (games-catalog.json) ─────────────────────────
  const dbIds = new Set(dbResults.map(g => g.boardlife_id));

  const catalogMatches = CATALOG
    .map(g => ({ ...g, score: matchScore(g.name, q) }))
    .filter(g => g.score > 0 && !dbIds.has(g.boardlife_id))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 20 - dbResults.length)
    .map(g => ({
      boardlife_id: g.boardlife_id,
      boardlife_url: `https://boardlife.co.kr/game/${g.boardlife_id}`,
      name: g.name,
      thumbnail_url: null as string | null,
    }));

  // ── 3. 병합: DB 결과 우선, 카탈로그 보충 ─────────────────────────
  const merged = [...dbResults, ...catalogMatches];

  return NextResponse.json(merged, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
