import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    const body = await req.json();
    const { ids } = body as { ids?: string[] };

    if (ids?.length) {
      await supabase.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', ids)
        .eq('player_id', user.id);
    } else {
      // 전체 읽음
      await supabase.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('player_id', user.id)
        .is('read_at', null);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
