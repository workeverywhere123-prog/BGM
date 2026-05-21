import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://boardlife.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SLUG_TO_KO: Record<string, string> = {
  strategy: '전략',
  abstract: '추상',
  customizable: '커스터마이즈',
  family: '가족',
  children: '아동',
  party: '파티',
  thematic: '테마',
  war: '전쟁',
};

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ categories: [] });

  try {
    const res = await fetch(`${BASE}/game/${id}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return NextResponse.json({ categories: [] });

    const html = await res.text();
    // rank/all/{slug}/숫자?game_id=숫자 패턴에서 슬러그 추출
    const slugs = [...html.matchAll(/rank\/all\/([a-z]+)\/\d+\?game_id=\d+/g)]
      .map(m => m[1])
      .filter(s => SLUG_TO_KO[s]);
    const unique = [...new Set(slugs)];
    const categories = unique.map(s => ({ slug: s, label: SLUG_TO_KO[s] }));
    return NextResponse.json({ categories }, {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
