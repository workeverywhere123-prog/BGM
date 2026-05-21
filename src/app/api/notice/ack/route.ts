import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    await supabase.from('players').update({ terms_agreed_at: new Date().toISOString() }).eq('id', user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
