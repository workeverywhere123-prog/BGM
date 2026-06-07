/**
 * /api/bgg/image?name=KOREAN_NAME&nameEn=ENGLISH_NAME&bggId=ID
 *
 * 서버사이드 BGG 썸네일 프록시
 * - 클라이언트에서 직접 BGG 호출 시 CORS 문제 or 한국어 이름 검색 실패
 * - 서버(localhost = residential IP)에서 호출하면 Cloudflare 차단 없음
 * - BGG XMLAPI2는 alternate name으로 한국어 검색도 지원
 */
import { NextRequest, NextResponse } from 'next/server';

const BGG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

const TIMEOUT = 10_000;

function toThumb(xml: string): string | null {
  const t = xml.match(/<thumbnail>(.*?)<\/thumbnail>/)?.[1]?.trim();
  if (!t) return null;
  return t.startsWith('//') ? `https:${t}` : t;
}

async function bggFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: BGG_HEADERS, signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function getThumb(bggId: string): Promise<string | null> {
  const xml = await bggFetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&type=boardgame`);
  return xml ? toThumb(xml) : null;
}

async function searchAndThumb(query: string, exact: boolean): Promise<string | null> {
  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame${exact ? '&exact=1' : ''}`;
  const xml = await bggFetch(url);
  if (!xml) return null;
  const id = xml.match(/item[^>]+type="boardgame"[^>]+id="(\d+)"/)?.[1];
  return id ? getThumb(id) : null;
}

// GET /api/bgg/image?name=&nameEn=&bggId=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') ?? '';
  const nameEn = searchParams.get('nameEn') ?? '';
  const bggId = searchParams.get('bggId') ?? '';

  let thumb: string | null = null;

  // 1) bgg_id 직접 조회 (가장 빠름)
  if (bggId && !thumb) thumb = await getThumb(bggId);

  // 2) 영문명 정확 검색
  if (nameEn && !thumb) thumb = await searchAndThumb(nameEn, true);

  // 3) 한국어명 정확 검색 (BGG alternate name에 한국어 있는 경우)
  if (name && !thumb) thumb = await searchAndThumb(name, true);

  // 4) 영문명 일반 검색
  if (nameEn && !thumb) thumb = await searchAndThumb(nameEn, false);

  // 5) 한국어명 일반 검색
  if (name && !thumb) thumb = await searchAndThumb(name, false);

  return NextResponse.json(
    { thumbnailUrl: thumb },
    {
      headers: {
        // 동일한 게임 이름이 반복 요청되면 캐시 (1시간)
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  );
}
