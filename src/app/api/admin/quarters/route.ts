import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const user = await requireSessionUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('players').select('is_admin').eq('id', user.id).maybeSingle();
  if (!data?.is_admin) throw new Error('Forbidden');
  return { user, supabase };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { name, started_at, ended_at, is_active } = await req.json();
    if (!name || !started_at) return NextResponse.json({ error: '이름과 시작일을 입력해주세요' }, { status: 400 });

    if (is_active) {
      await supabase.from('quarters').update({ is_active: false }).eq('is_active', true);
    }

    const { data, error } = await supabase
      .from('quarters')
      .insert({ name, started_at, ended_at: ended_at || null, is_active: !!is_active })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quarter: data });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { id, action, name, ended_at } = await req.json();

    if (action === 'activate') {
      await supabase.from('quarters').update({ is_active: false }).eq('is_active', true);
      await supabase.from('quarters').update({ is_active: true, ended_at: null }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'close') {
      await supabase.from('quarters').update({ is_active: false, ended_at: ended_at ?? new Date().toISOString() }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'update') {
      await supabase.from('quarters').update({ name, ended_at: ended_at || null }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await req.json();
    const { error } = await supabase.from('quarters').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
