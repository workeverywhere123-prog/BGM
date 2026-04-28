import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: league_id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: msgs } = await supabase
    .from('league_messages')
    .select('id, player_id, content, created_at')
    .eq('league_id', league_id)
    .order('created_at', { ascending: true })
    .limit(80);

  if (!msgs?.length) return NextResponse.json([]);

  const ids = [...new Set(msgs.map(m => m.player_id))];
  const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', ids);
  const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

  return NextResponse.json(msgs.map(m => ({ ...m, player: pmap[m.player_id] ?? { nickname: '?', username: '' } })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: league_id } = await params;
    const user = await requireSessionUser();
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('league_messages')
      .insert({ league_id, player_id: user.id, content: content.trim() })
      .select('id, player_id, content, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: player } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();
    return NextResponse.json({ ...data, player });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
