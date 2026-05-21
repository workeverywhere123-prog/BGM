import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    const body = await req.json();
    const { action } = body as { action: string };

    if (action === 'enter') {
      const { tickets } = body as { tickets: number };
      if (!tickets || tickets < 1) return NextResponse.json({ error: '티켓 수는 1 이상이어야 합니다' }, { status: 400 });

      const { data: raffle } = await supabase.from('raffles').select('status').eq('id', id).single();
      if (!raffle || raffle.status !== 'open') return NextResponse.json({ error: '참가할 수 없는 추첨입니다' }, { status: 400 });

      // Check existing entry
      const { data: existing } = await supabase.from('raffle_entries').select('id, tickets').eq('raffle_id', id).eq('player_id', user.id).maybeSingle();

      // Check chip balance
      const { data: balanceData } = await supabase
        .from('chip_transactions')
        .select('amount')
        .eq('player_id', user.id);
      const balance = (balanceData ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);
      const existingTickets = existing?.tickets ?? 0;
      const additionalTickets = tickets - existingTickets;
      if (additionalTickets <= 0) return NextResponse.json({ error: '기존 티켓 수보다 많아야 합니다' }, { status: 400 });
      if (balance < additionalTickets) return NextResponse.json({ error: `LAPIS가 부족합니다 (보유: ${balance}, 필요: ${additionalTickets})` }, { status: 400 });

      // Deduct chips
      const { data: quarter } = await supabase.from('quarters').select('id').eq('is_active', true).maybeSingle();
      await supabase.from('chip_transactions').insert({
        player_id: user.id,
        tx_type: 'raffle',
        amount: -additionalTickets,
        quarter_id: quarter?.id ?? null,
        note: `추첨 티켓 구매 (${additionalTickets}장)`,
        created_by: user.id,
      });

      // Upsert entry
      if (existing) {
        await supabase.from('raffle_entries').update({ tickets }).eq('id', existing.id);
      } else {
        await supabase.from('raffle_entries').insert({ raffle_id: id, player_id: user.id, tickets });
      }

      return NextResponse.json({ ok: true, tickets, newBalance: balance - additionalTickets });
    }

    if (action === 'draw') {
      // Admin only: check if user is admin
      const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
      if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

      const { data: raffle } = await supabase.from('raffles').select('status').eq('id', id).single();
      if (!raffle || raffle.status !== 'closed') return NextResponse.json({ error: '추첨 마감 후 진행하세요' }, { status: 400 });

      const { data: entries } = await supabase.from('raffle_entries').select('player_id, tickets').eq('raffle_id', id);
      if (!entries?.length) return NextResponse.json({ error: '참가자가 없습니다' }, { status: 400 });

      // Weighted random draw
      const pool: string[] = [];
      for (const e of entries) {
        for (let i = 0; i < e.tickets; i++) pool.push(e.player_id);
      }
      // Cryptographically fair: shuffle with crypto randomness
      for (let i = pool.length - 1; i > 0; i--) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        const j = arr[0] % (i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const winnerId = pool[0];

      await supabase.from('raffles').update({
        winner_id: winnerId,
        status: 'drawn',
        drawn_at: new Date().toISOString(),
      }).eq('id', id);

      const { data: winner } = await supabase.from('players').select('id, nickname, username').eq('id', winnerId).single();
      return NextResponse.json({ ok: true, winner });
    }

    if (action === 'close') {
      const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
      if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      await supabase.from('raffles').update({ status: 'closed' }).eq('id', id).eq('status', 'open');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
