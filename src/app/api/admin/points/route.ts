import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const user = await requireSessionUser();
  if (!user.is_admin) throw new Error('Forbidden');
  const supabase = await createSupabaseServerClient();
  return { user, supabase };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { player_id, amount, note, quarter_id } = await req.json();

    if (!player_id || amount === undefined || amount === 0) {
      return NextResponse.json({ error: '플레이어와 LAPIS를 입력해주세요' }, { status: 400 });
    }

    const { error } = await supabase.from('chip_transactions').insert({
      player_id,
      amount: parseInt(amount),
      tx_type: 'manual',
      note: note || '관리자 수동 조정',
      quarter_id: quarter_id || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
