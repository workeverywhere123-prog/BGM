import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function POST(req: NextRequest) {
  try {
    await requireSessionUser();
    if (!WEBHOOK_URL) return NextResponse.json({ ok: false, reason: 'no webhook' });

    const body = await req.json();
    const { type, game_name, game_type, participants, is_record, record_score, record_holder } = body as {
      type: 'match_result' | 'new_record';
      game_name: string;
      game_type: string;
      participants: { nickname: string; rank?: number; is_winner?: boolean; chip_change: number }[];
      is_record?: boolean;
      record_score?: number;
      record_holder?: string;
    };

    const GT_LABEL: Record<string, string> = {
      ranking: '순위전', mafia: '마피아', team: '팀전', coop: '협력', onevsmany: '1:다', deathmatch: '데스매치',
    };
    const GT_COLOR: Record<string, number> = {
      ranking: 0xC9A84C, mafia: 0xE879F9, team: 0x60A5FA, coop: 0x34D399, onevsmany: 0xF87171, deathmatch: 0xFB923C,
    };

    const typeLabel = GT_LABEL[game_type] ?? game_type;
    const color = GT_COLOR[game_type] ?? 0xC9A84C;

    const sortedParts = [...participants].sort((a, b) => {
      if (game_type === 'ranking') return (a.rank ?? 99) - (b.rank ?? 99);
      return a.is_winner === b.is_winner ? 0 : a.is_winner ? -1 : 1;
    });

    const fields = sortedParts.map(p => {
      const result = game_type === 'ranking'
        ? `${p.rank ?? '?'}위`
        : p.is_winner ? '✅ 승리' : '❌ 패배';
      const chip = p.chip_change > 0 ? `+${p.chip_change}칩` : `${p.chip_change}칩`;
      return { name: p.nickname, value: `${result} · ${chip}`, inline: true };
    });

    const embeds = [
      {
        title: `🎲 ${game_name || typeLabel} 경기 결과`,
        color,
        fields,
        footer: { text: 'BGM — Boardgame in Melbourne' },
        timestamp: new Date().toISOString(),
      },
    ];

    if (is_record && record_score != null && record_holder) {
      embeds.push({
        title: `⭐ 새로운 최고 기록!`,
        color: 0xE8CC80,
        fields: [
          { name: '게임', value: game_name, inline: true },
          { name: '점수', value: `${record_score.toLocaleString()}점`, inline: true },
          { name: '달성자', value: record_holder, inline: true },
        ],
        footer: { text: 'BGM 명예의 전당' },
        timestamp: new Date().toISOString(),
      });
    }

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds }),
    });

    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
