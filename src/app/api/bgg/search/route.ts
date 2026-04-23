import { NextRequest, NextResponse } from 'next/server';
import { searchBggGames } from '@/lib/bgg/api';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json([]);
  const results = await searchBggGames(q);
  return NextResponse.json(results);
}
