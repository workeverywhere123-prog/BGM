import { NextRequest, NextResponse } from 'next/server';

export interface BoardlifeGame {
  boardlife_id: string;
  boardlife_url: string;
  name: string;
  name_en: string | null;
  thumbnail_url: string | null;
  min_players: number | null;
  max_players: number | null;
}

const BASE = 'https://boardlife.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * boardlife.co.kr 게임 페이지의 og:image URL을 가져옴
 * - img.boardlife.co.kr CDN URLs: 브라우저에서 CORP 헤더로 차단됨
 * - boardlife.co.kr/data/... og:image URLs: CORP 없음 → 직접 로드 가능
 */
async function fetchOgImage(boardlife_id: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/game/${boardlife_id}`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
                || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json([]);

  try {
    const body = new URLSearchParams({ action: 'searchGame', keyword: q }).toString();

    const res = await fetch(`${BASE}/game_ajax.php`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Origin': BASE,
        'Referer': `${BASE}/boardgame`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.error('[boardlife] HTTP', res.status);
      return NextResponse.json([], { status: 502 });
    }

    const text = await res.text();
    let json: { success: boolean; games?: Array<{ number: number | string; title: string; thumb: string }> };
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[boardlife] non-JSON response:', text.slice(0, 200));
      return NextResponse.json([], { status: 502 });
    }

    if (!json.success || !json.games?.length) return NextResponse.json([]);

    // 검색 결과 상위 8개만 처리 (og:image 병렬 fetch)
    const top = json.games.slice(0, 8);
    const games: BoardlifeGame[] = await Promise.all(
      top.map(async g => {
        const id = String(g.number);
        // og:image URL 시도 (CORP 없음 → 브라우저에서 직접 로드 가능)
        // CDN thumb URL은 브라우저에서 CORP 차단되므로 og:image로 교체
        const ogImage = await fetchOgImage(id);
        return {
          boardlife_id: id,
          boardlife_url: `${BASE}/game/${id}`,
          name: g.title,
          name_en: null,
          thumbnail_url: ogImage ?? (g.thumb || null),
          min_players: null,
          max_players: null,
        };
      })
    );

    return NextResponse.json(games, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('[boardlife search error]', err);
    return NextResponse.json([], { status: 503 });
  }
}
