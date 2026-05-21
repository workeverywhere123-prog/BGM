'use client';

import { useState } from 'react';
import Link from 'next/link';
import LapisIcon from '@/components/LapisIcon';
import GameNameLink from '@/components/GameNameLink';

const GT_LABEL: Record<string, string> = {
  ranking: '순위전', mafia: '마피아', team: '팀전', coop: '협력', onevsmany: '1:다', deathmatch: '데스매치',
};
const GT_COLOR: Record<string, string> = {
  ranking: '#c9a84c', mafia: '#e879f9', team: '#60a5fa', coop: '#34d399', onevsmany: '#f87171', deathmatch: '#fb923c',
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

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

function MatchDetailModal({ match, pmap, onClose }: { match: Match; pmap: PlayerMap; onClose: () => void }) {
  const parts = [...match.match_participants].sort((a, b) => {
    if (match.game_type === 'ranking') return (a.rank ?? 99) - (b.rank ?? 99);
    return a.is_winner === b.is_winner ? 0 : a.is_winner ? -1 : 1;
  });
  const isRanked = match.is_ranked !== false;
  const colTemplate = '1fr 60px 60px 70px';

  const RANK_COLOR = (rank: number | null, isWinner: boolean, gameType: string) => {
    if (gameType === 'ranking') {
      return rank === 1 ? 'var(--gold)' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b87333' : 'rgba(244,239,230,0.35)';
    }
    return isWinner ? '#4ade80' : '#ff6b6b';
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(11,34,24,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        {/* 닫기 */}
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--white-dim)', fontSize: '1.1rem', cursor: 'pointer', opacity: 0.5, zIndex: 1 }}>✕</button>

        {/* 헤더 */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          {match.boardlife_game_name && (
            <div style={{ marginBottom: '0.5rem' }}>
              <GameNameLink name={match.boardlife_game_name} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.35rem', color: 'var(--foreground)' }} />
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
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--white-dim)', fontStyle: 'italic', marginTop: '0.4rem', opacity: 0.65 }}>
              {match.note}
            </p>
          )}
        </div>

        {/* 컬럼 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: colTemplate, gap: '0.5rem', padding: '0.45rem 2rem', fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.15em', color: 'rgba(201,168,76,0.45)', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
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
            const resultColor = RANK_COLOR(p.rank, p.is_winner, match.game_type);
            const chip = p.chip_change;
            return (
              <div key={p.player_id} style={{
                display: 'grid', gridTemplateColumns: colTemplate,
                alignItems: 'center', gap: '0.5rem',
                padding: '0.7rem 2rem',
                background: pi === 0 && isWinner ? 'rgba(201,168,76,0.05)' : 'transparent',
                borderBottom: pi < parts.length - 1 ? '1px solid rgba(201,168,76,0.05)' : 'none',
                borderLeft: `3px solid ${pi === 0 ? resultColor : 'transparent'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <Link href={`/profile/${player?.username ?? ''}`} onClick={onClose} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    {player?.nickname ?? '?'}
                  </Link>
                  {p.role && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: 'rgba(244,239,230,0.45)', border: '1px solid rgba(244,239,230,0.1)', padding: '0.05rem 0.3rem', flexShrink: 0 }}>{p.role}</span>}
                  {p.team && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', padding: '0.05rem 0.3rem', flexShrink: 0 }}>{p.team}팀</span>}
                  {p.is_mvp && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: '#e879f9', border: '1px solid rgba(232,121,249,0.35)', padding: '0.05rem 0.3rem', flexShrink: 0 }}>MVP</span>}
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
    </div>
  );
}

export default function RecentMatchesSection({
  matches,
  pmap,
}: {
  matches: Match[];
  pmap: PlayerMap;
}) {
  const [selected, setSelected] = useState<Match | null>(null);

  if (matches.length === 0) return null;

  return (
    <>
      <section style={{ marginTop: '3.5rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>
          🕐 최근 경기
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {matches.map(m => {
            const d = new Date(m.played_at);
            const label = m.boardlife_game_name || GT_LABEL[m.game_type] || m.game_type;
            const color = GT_COLOR[m.game_type] ?? 'rgba(201,168,76,0.4)';
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em',
                  padding: '0.35rem 0.9rem',
                  border: `1px solid ${color}55`,
                  background: `${color}08`,
                  color: 'var(--white-dim)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget).style.borderColor = color; (e.currentTarget).style.background = `${color}18`; (e.currentTarget).style.color = 'var(--foreground)'; }}
                onMouseLeave={e => { (e.currentTarget).style.borderColor = `${color}55`; (e.currentTarget).style.background = `${color}08`; (e.currentTarget).style.color = 'var(--white-dim)'; }}
              >
                {label}
                <span style={{ opacity: 0.45, marginLeft: '0.4rem' }}>
                  {d.getMonth() + 1}/{d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <MatchDetailModal match={selected} pmap={pmap} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
