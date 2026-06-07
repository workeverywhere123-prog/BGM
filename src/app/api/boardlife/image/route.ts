import { NextRequest, NextResponse } from 'next/server';

/**
 * 보드라이프 이미지 프록시
 *
 * 브라우저에서 img.boardlife.co.kr CDN을 직접 로드하면
 * Cross-Origin Resource Policy(CORP) 헤더로 인해
 * ERR_BLOCKED_BY_RESPONSE.NotSameOrigin 에러 발생.
 *
 * 이 라우트가 서버 사이드에서 이미지를 fetch한 뒤
 * 브라우저에 스트리밍 → 브라우저는 localhost URL만 봄.
 *
 * 사용: /api/boardlife/image?url=https%3A%2F%2Fimg.boardlife.co.kr%2F...
 */

const ALLOWED_HOSTS = [
  'img.boardlife.co.kr',
  'boardlife.co.kr',  // og:image URLs from main domain (no CORP header)
];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  // 화이트리스트 체크 (보안: boardlife 도메인만 허용)
  const allowed = ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!allowed) {
    return new NextResponse('Domain not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://boardlife.co.kr/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
      // next.js 서버 캐시: 1시간
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) {
      return new NextResponse(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // 브라우저 캐시: 24시간
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (err) {
    console.error('[boardlife image proxy error]', err);
    return new NextResponse('Proxy error', { status: 503 });
  }
}
