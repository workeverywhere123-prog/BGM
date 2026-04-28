import { NextRequest, NextResponse } from 'next/server';

function hasKorean(str: string) {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(str);
}

async function translateToEnglish(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    // data[0] is array of [translated, original, ...] segments
    const translated = (data[0] as [string, string][]).map(seg => seg[0]).join('');
    return translated.trim() || text;
  } catch {
    return text;
  }
}

export async function GET(req: NextRequest) {
  let q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q) return NextResponse.json([]);

  if (hasKorean(q)) {
    q = await translateToEnglish(q);
  }

  try {
    const res = await fetch(`https://melodice.org/api/autocomplete/?term=${encodeURIComponent(q)}`, {
      headers: {
        'Referer': 'https://melodice.org/',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
