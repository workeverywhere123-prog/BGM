'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Player {
  id: string; username: string; nickname: string;
  is_admin: boolean; is_active: boolean; created_at: string; total_chips: number;
}

export default function AdminPlayersClient({ players }: { players: Player[] }) {
  const [list, setList] = useState(players);
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleAdmin(id: string, current: boolean) {
    setLoading(id);
    try {
      const res = await fetch('/api/admin/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_admin: !current }),
      });
      if (res.ok) setList(l => l.map(p => p.id === id ? { ...p, is_admin: !current } : p));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', marginBottom: '2rem' }}>플레이어 관리</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 100px', gap: '1rem', padding: '0.5rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--gold-dim)' }}>
          <span>플레이어</span><span>가입일</span><span style={{ textAlign: 'center' }}>칩</span><span style={{ textAlign: 'center' }}>관리자</span><span />
        </div>

        {list.map(p => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 100px', gap: '1rem', alignItems: 'center', padding: '0.9rem 1.2rem', background: 'rgba(30,74,52,0.12)', borderLeft: `2px solid ${p.is_admin ? 'var(--gold)' : 'var(--gold-dim)'}` }}>
            <div>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{p.nickname}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', marginLeft: '0.5rem' }}>@{p.username}</span>
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: 'var(--gold)', textAlign: 'center' }}>{p.total_chips}</span>
            <span style={{ textAlign: 'center' }}>
              <button onClick={() => toggleAdmin(p.id, p.is_admin)} disabled={loading === p.id}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.7rem', border: `1px solid ${p.is_admin ? 'var(--gold)' : 'rgba(244,239,230,0.2)'}`, color: p.is_admin ? 'var(--gold)' : 'var(--white-dim)', background: 'none', cursor: 'pointer' }}>
                {loading === p.id ? '...' : p.is_admin ? '관리자 ✓' : '일반'}
              </button>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link href={`/profile/${p.username}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold-dim)', textDecoration: 'none' }}>프로필 →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
