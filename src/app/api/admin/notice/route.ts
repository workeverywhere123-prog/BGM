import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireSessionUser } from '@/lib/session';

async function requireAdmin() {
  const user = await requireSessionUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('players').select('is_admin').eq('id', user.id).maybeSingle();
  if (!data?.is_admin) throw new Error('권한 없음');
  return { user, supabase };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireAdmin();
    const { title, content, category, is_pinned } = await req.json();
    if (!title || !content) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });

    const { data, error } = await supabase.from('notices').insert({
      title, content, category: category ?? 'general', is_pinned: !!is_pinned, author_id: user.id,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}
