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
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error('[boardlife] status:', res.status);
      return NextResponse.json([]);
    }

    const json = await res.json() as { success: boolean; games?: Array<{ number: number | string; title: string; thumb: string }> };

    if (!json.success || !json.games?.length) return NextResponse.json([]);

    const games: BoardlifeGame[] = json.games.map(g => ({
      boardlife_id: String(g.number),
      boardlife_url: `${BASE}/game/${g.number}`,
      name: g.title,
      name_en: null,
      thumbnail_url: g.thumb || null,
      min_players: null,
      max_players: null,
    }));

    return NextResponse.json(games);
  } catch (err) {
    console.error('[boardlife search]', err);
    return NextResponse.json([]);
  }
}
