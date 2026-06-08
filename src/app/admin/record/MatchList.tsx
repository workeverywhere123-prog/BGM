'use client';

import { useState, useTransition } from 'react';
import { deleteMatchAction } from './actions';

type Participant = {
  player_id: string;
  chip_change: number;
  is_winner: boolean | null;
  team: string | null;
  role: string | null;
  rank: number | null;
  is_mvp: boolean;
  players: { nickname: string } | null;
};

type MatchItem = {
  id: string;
  game_type: string;
  played_at: string;
  note: string | null;
  meetings: { number: number; held_at: string } | null;
  match_participants: Participant[];
};

const TYPE_COLOR: Record<string, string> = {
  team: '#4ade80', mafia: '#f87171', deathmatch: '#fb923c',
  onevsmany: '#60a5fa', coop: '#e879f9', ranking: 'var(--gold)',
};

interface Props {
  matches: MatchItem[];
  gameTypeKr: Record<string, string>;
}

export default function MatchList({ matches, gameTypeKr }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm('이 경기 기록을 삭제합니까?\n라피스 변동도 함께 취소됩니다.')) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteMatchAction(id);
      setDeletingId(null);
    });
  };

  if (matches.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
        기록된 경기가 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {matches.map(m => {
        const color = TYPE_COLOR[m.game_type] ?? 'var(--gold)';
        const isDeleting = deletingId === m.id && isPending;
        const date = m.meetings
          ? `제${m.meetings.number}회 · ${m.meetings.held_at.slice(0, 10)}`
          : new Date(m.played_at).toLocaleDateString('ko-KR');

        return (
          <div key={m.id} style={{
            padding: '1rem 1.25rem',
            background: 'rgba(30,74,52,0.12)',
            border: `1px solid rgba(201,168,76,0.1)`,
            borderLeft: `3px solid ${color}`,
            opacity: isDeleting ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}>
            {/* 상단 행: 타입 + 날짜 + 삭제 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em',
                  color, border: `1px solid ${color}44`, padding: '0.1rem 0.5rem',
                }}>
                  {gameTypeKr[m.game_type] ?? m.game_type}
                </span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.55 }}>
                  {date}
                </span>
                {m.note && (
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--white-dim)', opacity: 0.5, fontStyle: 'italic' }}>
                    {m.note}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={isPending}
                style={{
                  background: 'none', border: '1px solid rgba(248,113,113,0.3)',
                  color: '#f87171', fontFamily: "'Cinzel', serif", fontSize: '0.5rem',
                  padding: '0.2rem 0.6rem', cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.4 : 0.7, transition: 'opacity 0.15s',
                  letterSpacing: '0.05em',
                }}
              >
                삭제
              </button>
            </div>

            {/* 참여자 목록 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {m.match_participants.map((p, i) => {
                const plus = p.chip_change > 0;
                const minus = p.chip_change < 0;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.2rem 0.5rem',
                    background: p.is_winner === true ? 'rgba(74,222,128,0.06)'
                      : p.is_winner === false ? 'rgba(248,113,113,0.06)' : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${p.is_winner === true ? 'rgba(74,222,128,0.2)' : p.is_winner === false ? 'rgba(248,113,113,0.15)' : 'rgba(201,168,76,0.08)'}`,
                  }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--foreground)' }}>
                      {p.players?.nickname ?? '?'}
                    </span>
                    {p.team && (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: 'var(--white-dim)', opacity: 0.5 }}>
                        {p.team}
                      </span>
                    )}
                    {p.rank != null && (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)' }}>
                        {p.rank}위
                      </span>
                    )}
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: '0.55rem', fontWeight: 600,
                      color: plus ? '#4ade80' : minus ? '#f87171' : 'var(--white-dim)',
                      opacity: (!plus && !minus) ? 0.4 : 1,
                    }}>
                      {plus ? '+' : ''}{p.chip_change}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
