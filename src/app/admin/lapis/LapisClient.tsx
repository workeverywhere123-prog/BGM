'use client';

import { useState, useTransition, useMemo } from 'react';
import LapisIcon from '@/components/LapisIcon';
import { deleteLapisAction, addManualLapisAction } from './actions';

const TX_META: Record<string, { label: string; color: string }> = {
  game:        { label: '게임',        color: '#60a5fa' },
  attendance:  { label: '출석',        color: '#4ade80' },
  late:        { label: '지각',        color: '#fb923c' },
  absence:     { label: '불참',        color: '#f87171' },
  vote_skip:   { label: '투표 미참여', color: '#f87171' },
  draw_use:    { label: '추첨 사용',   color: '#c084fc' },
  draw_win:    { label: '추첨 당첨',   color: 'var(--gold)' },
  manual:      { label: '수동 조정',   color: 'var(--gold-dim)' },
  welcome:     { label: '가입 보너스', color: '#4ade80' },
  rules_read:  { label: '규칙 정독',   color: '#4ade80' },
};

export type TxRow = {
  id: string;
  player_id: string;
  tx_type: string;
  amount: number;
  note: string | null;
  created_at: string;
  match_id: string | null;
  meeting_id: string | null;
  players: { nickname: string; username: string } | null;
};

export type PlayerOption = { id: string; nickname: string; username: string; total: number };

interface Props {
  transactions: TxRow[];
  players: PlayerOption[];
}

/* ─── 지급 폼 ─── */
function AddForm({ players, onAdded }: { players: PlayerOption[]; onAdded: (tx: TxRow) => void }) {
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [isPending, start] = useTransition();

  const submit = () => {
    const n = parseInt(amount);
    if (!playerId || !note.trim() || isNaN(n) || n === 0) {
      setMsg('플레이어 · 수량 · 사유를 모두 입력하세요');
      return;
    }
    start(async () => {
      const res = await addManualLapisAction(playerId, n, note.trim());
      if (!res.ok) { setMsg(res.error.message); return; }
      const p = players.find(x => x.id === playerId);
      onAdded({
        id: Date.now().toString(),
        player_id: playerId,
        tx_type: 'manual',
        amount: n,
        note: note.trim(),
        created_at: new Date().toISOString(),
        match_id: null,
        meeting_id: null,
        players: p ? { nickname: p.nickname, username: p.username } : null,
      });
      setAmount(''); setNote(''); setMsg('✓ 지급 완료');
      setTimeout(() => setMsg(''), 3000);
    });
  };

  return (
    <div style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(30,74,52,0.12)', padding: '1.5rem' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.22em', color: 'var(--gold-dim)', marginBottom: '1.2rem' }}>
        수동 LAPIS 지급 / 차감
      </p>

      {/* 플레이어 선택 */}
      <div style={{ marginBottom: '0.8rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.6, marginBottom: '0.4rem' }}>플레이어</p>
        <select value={playerId} onChange={e => setPlayerId(e.target.value)} style={{
          width: '100%', padding: '0.5rem 0.7rem',
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)',
          color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem',
        }}>
          {players.map(p => (
            <option key={p.id} value={p.id}>
              {p.nickname} (@{p.username}) — {p.total} LAPIS
            </option>
          ))}
        </select>
      </div>

      {/* 수량 */}
      <div style={{ marginBottom: '0.8rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.6, marginBottom: '0.4rem' }}>수량</p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {[-5, -3, -1, 1, 3, 5, 10].map(n => (
            <button key={n} type="button" onClick={() => setAmount(String(n))} style={{
              padding: '0.3rem 0.6rem',
              fontFamily: "'Cinzel', serif", fontSize: '0.62rem',
              border: `1px solid ${n > 0 ? 'rgba(201,168,76,0.35)' : 'rgba(248,113,113,0.35)'}`,
              background: amount === String(n)
                ? (n > 0 ? 'rgba(201,168,76,0.15)' : 'rgba(248,113,113,0.12)')
                : 'transparent',
              color: n > 0 ? 'var(--gold)' : '#f87171',
              cursor: 'pointer',
            }}>{n > 0 ? `+${n}` : n}</button>
          ))}
        </div>
        <input
          type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="직접 입력 (음수 가능)"
          style={{
            width: '100%', padding: '0.5rem 0.7rem',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)',
            color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.8rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 사유 */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.6, marginBottom: '0.4rem' }}>사유</p>
        <input
          value={note} onChange={e => setNote(e.target.value)}
          placeholder="예: 이벤트 보너스, 페널티 등"
          style={{
            width: '100%', padding: '0.5rem 0.7rem',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)',
            color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        onClick={submit} disabled={isPending}
        style={{
          width: '100%', padding: '0.7rem',
          background: isPending ? 'rgba(201,168,76,0.3)' : 'var(--gold)',
          color: '#0b2218', border: 'none',
          fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
          cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        }}
      >
        <LapisIcon size={14} />
        {isPending ? '처리 중...' : 'LAPIS 적용'}
      </button>

      {msg && (
        <p style={{
          fontFamily: "'Cinzel', serif", fontSize: '0.58rem', marginTop: '0.6rem', textAlign: 'center',
          color: msg.startsWith('✓') ? '#4ade80' : '#f87171',
        }}>{msg}</p>
      )}
    </div>
  );
}

/* ─── 메인 클라이언트 ─── */
export default function LapisClient({ transactions: initTxs, players }: Props) {
  const [txs, setTxs] = useState(initTxs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startDelete] = useTransition();

  // 필터 상태
  const [filterPlayer, setFilterPlayer] = useState('');
  const [filterType, setFilterType] = useState('');

  const allTypes = useMemo(() => {
    const s = new Set(txs.map(t => t.tx_type));
    return Array.from(s).sort();
  }, [txs]);

  const filtered = useMemo(() => txs.filter(t => {
    if (filterPlayer && t.player_id !== filterPlayer) return false;
    if (filterType && t.tx_type !== filterType) return false;
    return true;
  }), [txs, filterPlayer, filterType]);

  // 합계
  const filteredSum = filtered.reduce((s, t) => s + t.amount, 0);

  const handleDelete = (id: string) => {
    if (!confirm('이 LAPIS 이력을 삭제합니까?\n삭제하면 해당 수량이 취소됩니다.')) return;
    setDeletingId(id);
    startDelete(async () => {
      const res = await deleteLapisAction(id);
      if (res.ok) setTxs(prev => prev.filter(t => t.id !== id));
      setDeletingId(null);
    });
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>ADMIN</p>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', lineHeight: 1 }}>LAPIS 관리</h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.45, marginTop: '0.4rem', letterSpacing: '0.08em' }}>
            총 {txs.length}건 이력
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

        {/* 왼쪽: 이력 목록 */}
        <div>
          {/* 필터 바 */}
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)} style={{
              padding: '0.4rem 0.7rem', background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)',
              fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem',
            }}>
              <option value="">전체 플레이어</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.nickname} (@{p.username})</option>
              ))}
            </select>

            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
              padding: '0.4rem 0.7rem', background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)',
              fontFamily: "'Cinzel', serif", fontSize: '0.65rem',
            }}>
              <option value="">전체 타입</option>
              {allTypes.map(t => (
                <option key={t} value={t}>{TX_META[t]?.label ?? t}</option>
              ))}
            </select>

            {(filterPlayer || filterType) && (
              <button onClick={() => { setFilterPlayer(''); setFilterType(''); }} style={{
                padding: '0.4rem 0.8rem', background: 'transparent',
                border: '1px solid rgba(248,113,113,0.3)', color: '#f87171',
                fontFamily: "'Cinzel', serif", fontSize: '0.55rem', cursor: 'pointer',
              }}>
                필터 초기화
              </button>
            )}

            <span style={{ marginLeft: 'auto', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {filtered.length}건 합계:
              <span style={{ color: filteredSum >= 0 ? 'var(--gold)' : '#f87171', fontWeight: 600 }}>
                {filteredSum >= 0 ? '+' : ''}{filteredSum}
              </span>
              <LapisIcon size={11} />
            </span>
          </div>

          {/* 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', opacity: 0.5, fontStyle: 'italic' }}>
                이력이 없습니다
              </div>
            ) : filtered.map(tx => {
              const meta = TX_META[tx.tx_type] ?? { label: tx.tx_type, color: 'var(--white-dim)' };
              const isDeleting = deletingId === tx.id && isPending;
              const plus = tx.amount > 0;

              return (
                <div key={tx.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.8rem 1rem',
                  background: 'rgba(30,74,52,0.1)',
                  borderLeft: `3px solid ${meta.color}`,
                  border: `1px solid rgba(201,168,76,0.08)`,
                  borderLeftWidth: 3,
                  opacity: isDeleting ? 0.3 : 1,
                  transition: 'opacity 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap', minWidth: 0 }}>
                    {/* 타입 뱃지 */}
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.08em',
                      color: meta.color, border: `1px solid ${meta.color}44`,
                      padding: '0.1rem 0.45rem', flexShrink: 0,
                    }}>{meta.label}</span>

                    {/* 플레이어 */}
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)', flexShrink: 0 }}>
                      {tx.players?.nickname ?? '?'}
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5, flexShrink: 0 }}>
                      @{tx.players?.username ?? '-'}
                    </span>

                    {/* 수량 */}
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 700,
                      color: plus ? '#4ade80' : '#f87171',
                      display: 'inline-flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0,
                    }}>
                      {plus ? '+' : ''}{tx.amount} <LapisIcon size={11} />
                    </span>

                    {/* 사유 */}
                    {tx.note && (
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', color: 'var(--white-dim)', opacity: 0.6, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {tx.note}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.45, whiteSpace: 'nowrap' }}>
                      {new Date(tx.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={isPending}
                      style={{
                        background: 'none', border: '1px solid rgba(248,113,113,0.25)',
                        color: '#f87171', fontFamily: "'Cinzel', serif", fontSize: '0.5rem',
                        padding: '0.18rem 0.5rem', cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.35 : 0.65, letterSpacing: '0.05em',
                        transition: 'opacity 0.15s', flexShrink: 0,
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 오른쪽: 지급 폼 */}
        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.22em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>
            LAPIS 지급 · 차감
          </p>
          <AddForm
            players={players}
            onAdded={tx => setTxs(prev => [tx, ...prev])}
          />

          {/* 플레이어별 잔액 요약 */}
          <div style={{ marginTop: '1.5rem', border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(30,74,52,0.08)', padding: '1.2rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>현재 잔액</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {players
                .sort((a, b) => b.total - a.total)
                .map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--foreground)' }}>
                      {p.nickname}
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      {p.total} <LapisIcon size={11} />
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
