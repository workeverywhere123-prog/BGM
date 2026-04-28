import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const user = await requireSessionUser();
  if (!user.is_admin) throw new Error('Forbidden');
  const supabase = await createSupabaseServerClient();
  return { supabase };
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { id, status } = await req.json();
    await supabase.from('rooms').update({ status: status ?? 'closed' }).eq('id', id);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await req.json();
    await supabase.from('rooms').update({ status: 'closed' }).eq('id', id);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
