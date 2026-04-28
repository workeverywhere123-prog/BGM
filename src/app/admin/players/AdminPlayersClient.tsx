'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import LapisIcon from '@/components/LapisIcon';

interface Player {
  id: string; username: string; nickname: string;
  is_admin: boolean; created_at: string; total_chips: number;
  discord_id?: string | null; quarter_points?: number;
}

export default function AdminPlayersClient({ players, activeQuarterId }: {
  players: Player[]; activeQuarterId: string | null;
}) {
  const [list, setList] = useState(players);
  const [loading, setLoading] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Admin toggle ── */
  async function toggleAdmin(id: string, current: boolean) {
    setLoading(id);
    const res = await fetch('/api/admin/players', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_admin: !current }),
    });
    if (res.ok) setList(l => l.map(p => p.id === id ? { ...p, is_admin: !current } : p));
    setLoading(null);
  }

  /* ── Point adjustment ── */
  function PointForm({ player }: { player: Player }) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState('');

    const submit = () => startTransition(async () => {
      setMsg('');
      const res = await fetch('/api/admin/points', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id, amount: parseInt(amount),
          note, quarter_id: activeQuarterId,
        }),
      });
      if (!res.ok) { setMsg((await res.json()).error); return; }
      const delta = parseInt(amount);
      setList(l => l.map(p => p.id === player.id ? { ...p, total_chips: p.total_chips + delta } : p));
      setAmount(''); setNote(''); setMsg('✓ 조정 완료');
    });

    return (
      <div style={{ padding: '1rem 1.2rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><LapisIcon size={11} /> LAPIS 수동 조정 — 현재 {player.total_chips} <LapisIcon size={11} /> LAPIS</span>
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[-3, -2, -1, 1, 2, 3].map(n => (
            <button key={n} type="button" onClick={() => setAmount(String(n))} style={{
              fontFamily: "'Cinzel', serif", fontSize: '0.62rem',
              width: 36, height: 32, cursor: 'pointer',
              border: `1px solid ${n > 0 ? 'rgba(201,168,76,0.3)' : 'rgba(255,100,100,0.3)'}`,
              background: amount === String(n) ? (n > 0 ? 'rgba(201,168,76,0.15)' : 'rgba(255,100,100,0.12)') : 'transparent',
              color: n > 0 ? 'var(--gold)' : '#ff8888',
            }}>{n > 0 ? `+${n}` : n}</button>
          ))}
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="직접입력"
            style={{ width: 80, padding: '0.35rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.7rem' }} />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="사유 (필수)"
            style={{ flex: 1, minWidth: 120, padding: '0.35rem 0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem' }} />
          <button onClick={submit} disabled={isPending || !amount || !note}
            style={{ padding: '0.35rem 1rem', background: (!amount || !note) ? 'rgba(201,168,76,0.2)' : 'var(--gold)', color: '#0b2218', border: 'none', cursor: (!amount || !note) ? 'not-allowed' : 'pointer', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', fontWeight: 600 }}>
            {isPending ? '...' : '적용'}
          </button>
        </div>
        {msg && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: msg.startsWith('✓') ? '#4ade80' : '#ff8888', marginTop: '0.4rem' }}>{msg}</p>}

        {/* Discord ID */}
        <DiscordField player={player} onUpdate={did => setList(l => l.map(p => p.id === player.id ? { ...p, discord_id: did } : p))} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.8rem', color: 'var(--foreground)', lineHeight: 1 }}>플레이어 관리</h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>PLAYER MANAGEMENT</p>
        </div>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--white-dim)' }}>총 {list.length}명</span>
      </div>

      {/* 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 80px 90px', gap: '1rem', padding: '0.5rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', borderBottom: '1px solid rgba(201,168,76,0.1)', marginBottom: 2 }}>
        <span>플레이어</span><span>가입일</span><span style={{ textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>누적 <LapisIcon size={11} /> LAPIS</span><span style={{ textAlign: 'center' }}>관리자</span><span style={{ textAlign: 'center' }}>액션</span>
      </div>

      {list.map(p => (
        <div key={p.id} style={{ marginBottom: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 80px 90px', gap: '1rem', alignItems: 'center', padding: '0.8rem 1.2rem', background: p.is_admin ? 'rgba(201,168,76,0.06)' : 'rgba(30,74,52,0.12)', borderLeft: `2px solid ${p.is_admin ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, cursor: 'pointer' }}
            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
            <div>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{p.nickname}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--white-dim)', marginLeft: '0.5rem', opacity: 0.6 }}>@{p.username}</span>
              {p.discord_id && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: '#5865f2', marginLeft: '0.5rem' }}>Discord ✓</span>}
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: 'var(--gold)', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>{p.total_chips} <LapisIcon size={12} /> LAPIS</span>
            <span style={{ textAlign: 'center' }}>
              <button onClick={e => { e.stopPropagation(); toggleAdmin(p.id, p.is_admin); }}
                disabled={loading === p.id}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', padding: '0.25rem 0.6rem', border: `1px solid ${p.is_admin ? 'var(--gold)' : 'rgba(244,239,230,0.15)'}`, color: p.is_admin ? 'var(--gold)' : 'var(--white-dim)', background: 'none', cursor: 'pointer' }}>
                {loading === p.id ? '...' : p.is_admin ? '관리자' : '일반'}
              </button>
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
              <Link href={`/profile/${p.username}`} onClick={e => e.stopPropagation()}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold-dim)', textDecoration: 'none' }}>프로필</Link>
              <span style={{ color: 'var(--white-dim)', opacity: 0.3, fontSize: '0.6rem' }}>{expandedId === p.id ? '▲' : '▼'}</span>
            </div>
          </div>

          {expandedId === p.id && <PointForm player={p} />}
        </div>
      ))}
    </div>
  );
}

function DiscordField({ player, onUpdate }: { player: { id: string; discord_id?: string | null }; onUpdate: (v: string) => void }) {
  const [val, setVal] = useState(player.discord_id ?? '');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await fetch('/api/admin/players', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: player.id, discord_id: val }),
    });
    onUpdate(val); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.8rem' }}>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#5865f2', minWidth: 80 }}>Discord ID</span>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="username#0000"
        style={{ flex: 1, padding: '0.3rem 0.6rem', background: 'rgba(88,101,242,0.05)', border: '1px solid rgba(88,101,242,0.25)', color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.65rem' }} />
      <button onClick={save}
        style={{ padding: '0.3rem 0.8rem', background: 'rgba(88,101,242,0.15)', border: '1px solid rgba(88,101,242,0.3)', color: '#5865f2', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '0.6rem' }}>
        {saved ? '✓' : '저장'}
      </button>
    </div>
  );
}
