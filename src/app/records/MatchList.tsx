'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import LapisIcon from '@/components/LapisIcon';
import GameNameLink from '@/components/GameNameLink';
import { GT_LABEL, GT_COLOR, RANK_COLOR } from '@/lib/constants';

type Participant = {
  player_id: string;
  rank: number | null;
  team: string | null;
  role: string | null;
  is_winner: boolean;
  is_mvp: boolean;
  score: number | null;
  chip_change: number | null;
};
type Match = {
  id: string;
  game_type: string;
  played_at: string;
  is_ranked: boolean;
  boardlife_game_name: string | null;
  note: string | null;
  match_participants: Participant[];
};
type PlayerMap = Record<string, { id: string; nickname: string; username: string }>;

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  const M = d.getMonth() + 1;
  const D = d.getDate();
  const W = DAYS[d.getDay()];
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${M}월 ${D}일 (${W}) ${h}:${m}`;
}

function RankBadge({ rank }: { rank: number }) {
  const symbols = ['✦', '②', '③'];
  return (
    <span style={{
      fontFamily: "'Cinzel', serif",
      fontSize: rank <= 3 ? '1.2rem' : '1rem',
      width: 28, textAlign: 'center' as const, display: 'inline-block',
      color: rank <= 3 ? RANK_COLOR[rank - 1] : 'rgba(244,239,230,0.3)',
    }}>
      {rank <= 3 ? symbols[rank - 1] : rank}
    </span>
  );
}

function MatchCard({ match, pmap }: { match: Match; pmap: PlayerMap }) {
  const parts = [...match.match_participants].sort((a, b) => {
    if (match.game_type === 'ranking') return (a.rank ?? 99) - (b.rank ?? 99);
    return a.is_winner === b.is_winner ? 0 : a.is_winner ? -1 : 1;
  });
  const isRanked = match.is_ranked !== false;
  const colTemplate = '1fr 60px 60px 70px';

  return (
    <div style={{ border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(22,53,36,0.2)' }}>
      {/* 헤더 */}
      <div style={{ padding: '1rem 1.4rem', borderBottom: '1px solid rgba(201,168,76,0.08)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {match.boardlife_game_name && (
            <div style={{ marginBottom: '0.25rem' }}>
              <GameNameLink name={match.boardlife_game_name} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', color: 'var(--foreground)' }} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em', padding: '0.15rem 0.6rem', border: `1px solid ${GT_COLOR[match.game_type] ?? 'var(--gold-dim)'}55`, color: GT_COLOR[match.game_type] ?? 'var(--gold)', background: `${GT_COLOR[match.game_type] ?? 'var(--gold)'}10` }}>
              {GT_LABEL[match.game_type] ?? match.game_type}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', padding: '0.15rem 0.5rem', border: isRanked ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(244,239,230,0.12)', color: isRanked ? 'var(--gold)' : 'rgba(244,239,230,0.3)' }}>
              {isRanked ? '🏆 랭크' : '🎮 친선'}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'rgba(244,239,230,0.4)', letterSpacing: '0.08em' }}>
              {fmtDate(match.played_at)} · {parts.length}명
            </span>
          </div>
          {match.note && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--white-dim)', fontStyle: 'italic', marginTop: '0.3rem', opacity: 0.65 }}>
              {match.note}
            </p>
          )}
        </div>
      </div>

      {/* 컬럼 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: colTemplate, gap: '0.5rem', padding: '0.4rem 1.4rem', fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.45)', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
        <span>PLAYER</span>
        <span style={{ textAlign: 'right' }}>점수</span>
        <span style={{ textAlign: 'right' }}>결과</span>
        <span style={{ textAlign: 'right', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}><LapisIcon size={9} />LAPIS</span>
      </div>

      {/* 참가자 */}
      <div>
        {parts.map((p, pi) => {
          const player = pmap[p.player_id];
          const isWinner = match.game_type === 'ranking' ? p.rank === 1 : p.is_winner;
          const resultText = match.game_type === 'ranking'
            ? (p.rank ? `${p.rank}위` : '—')
            : (p.is_winner ? '승' : '패');
          const resultColor = match.game_type === 'ranking'
            ? (p.rank === 1 ? 'var(--gold)' : p.rank === 2 ? '#94a3b8' : p.rank === 3 ? '#b87333' : 'rgba(244,239,230,0.35)')
            : (p.is_winner ? '#4ade80' : '#ff6b6b');
          const chip = p.chip_change;

          return (
            <div key={p.player_id} style={{
              display: 'grid', gridTemplateColumns: colTemplate,
              alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.4rem',
              background: pi === 0 && isWinner ? 'rgba(201,168,76,0.05)' : 'transparent',
              borderBottom: pi < parts.length - 1 ? '1px solid rgba(201,168,76,0.05)' : 'none',
              borderLeft: `3px solid ${pi === 0 ? resultColor : 'transparent'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <Link href={`/profile/${player?.username ?? ''}`} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {player?.nickname ?? '?'}
                </Link>
                {p.role && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.45)', border: '1px solid rgba(244,239,230,0.1)', padding: '0.05rem 0.3rem', flexShrink: 0 }}>{p.role}</span>}
                {p.team && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', padding: '0.05rem 0.3rem', flexShrink: 0 }}>{p.team}팀</span>}
                {p.is_mvp && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: '#e879f9', border: '1px solid rgba(232,121,249,0.35)', padding: '0.05rem 0.3rem', flexShrink: 0 }}>MVP</span>}
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem', color: 'var(--white-dim)', textAlign: 'right', opacity: p.score != null ? 1 : 0.2 }}>
                {p.score != null ? p.score : '—'}
              </span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', fontWeight: 600, color: resultColor, textAlign: 'right' }}>
                {resultText}
              </span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.15rem', color: chip == null ? 'rgba(244,239,230,0.2)' : chip > 0 ? 'var(--gold)' : chip < 0 ? '#ff6b6b' : 'rgba(244,239,230,0.4)' }}>
                {chip != null ? `${chip > 0 ? '+' : ''}${chip}` : '—'}
                {chip != null && <LapisIcon size={10} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MatchList({
  matches,
  pmap,
  totalLabel,
}: {
  matches: Match[];
  pmap: PlayerMap;
  totalLabel: string;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return matches;
    const q = search.trim().toLowerCase();
    return matches.filter(m => {
      if (m.boardlife_game_name?.toLowerCase().includes(q)) return true;
      if (m.note?.toLowerCase().includes(q)) return true;
      if (m.match_participants.some(p => pmap[p.player_id]?.nickname?.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [matches, search, pmap]);

  return (
    <div>
      {/* 검색 + 카운트 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(201,168,76,0.4)', fontSize: '0.75rem', pointerEvents: 'none' }}>
            ⌕
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="게임명 · 플레이어 · 메모 검색..."
            style={{
              width: '100%',
              background: 'rgba(14,26,20,0.8)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: 'var(--foreground)',
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '0.95rem',
              padding: '0.55rem 0.9rem 0.55rem 2.2rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(244,239,230,0.3)', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
          {totalLabel} {search && filtered.length !== matches.length ? `→ ${filtered.length}경기` : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="board-empty">
          <p>{search ? '검색 결과가 없습니다' : '경기 기록이 없습니다'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filtered.map(match => (
            <MatchCard key={match.id} match={match} pmap={pmap} />
          ))}
        </div>
      )}
    </div>
  );
}
