'use client';

import { useState, useTransition } from 'react';
import LapisIcon from '@/components/LapisIcon';

interface Quarter {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
}

export default function QuartersClient({ initialQuarters }: { initialQuarters: Quarter[] }) {
  const [quarters, setQuarters] = useState<Quarter[]>(initialQuarters);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 10));
  const [isActive, setIsActive] = useState(false);
  const [msg, setMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const reload = async () => {
    const res = await fetch('/api/admin/quarters-list');
    if (res.ok) setQuarters(await res.json());
  };

  const handleCreate = () => startTransition(async () => {
    setMsg('');
    const res = await fetch('/api/admin/quarters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, started_at: new Date(startedAt).toISOString(), is_active: isActive }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error); return; }
    setMsg('분기가 생성되었습니다!');
    setName(''); setShowNew(false);
    if (isActive) {
      setQuarters(prev => prev.map(q => ({ ...q, is_active: false })).concat({ ...data.quarter }));
    } else {
      setQuarters(prev => [...prev, data.quarter]);
    }
  });

  const activate = (id: string) => startTransition(async () => {
    const res = await fetch('/api/admin/quarters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'activate' }),
    });
    if (res.ok) setQuarters(prev => prev.map(q => ({ ...q, is_active: q.id === id })));
  });

  const close = (id: string) => startTransition(async () => {
    if (!confirm('이 분기를 종료하시겠습니까?')) return;
    const res = await fetch('/api/admin/quarters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'close' }),
    });
    if (res.ok) setQuarters(prev => prev.map(q => q.id === id ? { ...q, is_active: false, ended_at: new Date().toISOString() } : q));
  });

  const deleteQ = (id: string) => startTransition(async () => {
    if (!confirm('이 분기를 삭제하시겠습니까? 연결된 LAPIS 기록의 분기 정보가 초기화됩니다.')) return;
    const res = await fetch('/api/admin/quarters', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setQuarters(prev => prev.filter(q => q.id !== id));
  });

  const rowStyle = (active: boolean) => ({
    display: 'grid',
    gridTemplateColumns: '1fr 120px 120px auto',
    gap: '1rem',
    alignItems: 'center',
    padding: '1rem 1.2rem',
    background: active ? 'rgba(201,168,76,0.06)' : 'rgba(30,74,52,0.1)',
    borderLeft: `2px solid ${active ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}`,
    marginBottom: 1,
  });

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: 'var(--foreground)', lineHeight: 1 }}>분기 관리</h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>QUARTER MANAGEMENT</p>
        </div>
        <button onClick={() => setShowNew(v => !v)} style={{
          fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
          padding: '0.6rem 1.4rem', border: '1px solid var(--gold)', color: 'var(--gold)',
          background: 'transparent', cursor: 'pointer',
        }}>
          {showNew ? '취소' : '+ 새 분기'}
        </button>
      </div>

      {/* 안내 */}
      <div style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.05)', padding: '1rem 1.2rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: '0.3rem' }}>분기 시스템 안내</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', lineHeight: 1.6 }}>
          활성 분기가 하나만 존재할 수 있습니다. 새 분기를 활성화하면 이전 분기는 자동으로 비활성화됩니다.
          분기별 랭킹은 해당 분기 내 <LapisIcon size={12} /> LAPIS만 집계되며, 누적 보유량은 모든 분기를 포함합니다.
        </p>
      </div>

      {/* 새 분기 폼 */}
      {showNew && (
        <div style={{ border: '1px solid rgba(201,168,76,0.3)', padding: '1.5rem', marginBottom: '2rem', background: 'rgba(30,74,52,0.15)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)', marginBottom: '1.2rem' }}>새 분기 생성</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--white-dim)', display: 'block', marginBottom: '0.4rem' }}>분기 이름 *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="예: 2026 Q2"
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--foreground)', padding: '0.6rem 0.8rem', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--white-dim)', display: 'block', marginBottom: '0.4rem' }}>시작일 *</label>
              <input
                type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--foreground)', padding: '0.6rem 0.8rem', fontFamily: "'Cinzel', serif", fontSize: '0.8rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginBottom: '1.2rem' }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ accentColor: 'var(--gold)', width: 16, height: 16 }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--white-dim)' }}>
              즉시 활성화 (현재 활성 분기가 있으면 자동 비활성화)
            </span>
          </label>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button onClick={handleCreate} disabled={!name || !startedAt || isPending} style={{
              fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
              padding: '0.6rem 1.4rem', background: 'var(--gold)', color: '#0b2218',
              border: 'none', cursor: 'pointer', opacity: (!name || !startedAt) ? 0.5 : 1,
            }}>
              {isPending ? '저장 중...' : '생성'}
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: msg.includes('!') ? '#4ade80' : '#ff8888', marginBottom: '1rem', padding: '0.8rem 1rem', border: `1px solid ${msg.includes('!') ? 'rgba(74,222,128,0.3)' : 'rgba(255,100,100,0.3)'}` }}>
          {msg}
        </p>
      )}

      {/* 분기 목록 */}
      <div>
        {/* 헤더 행 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px auto', gap: '1rem', padding: '0.5rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', borderBottom: '1px solid rgba(201,168,76,0.15)', marginBottom: 4 }}>
          <span>분기명</span><span>시작일</span><span>종료일</span><span>액션</span>
        </div>

        {quarters.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', opacity: 0.5 }}>
            생성된 분기가 없습니다
          </div>
        )}

        {quarters.map(q => (
          <div key={q.id} style={rowStyle(q.is_active)}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--foreground)' }}>{q.name}</span>
                {q.is_active && (
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.1rem 0.4rem' }}>● 진행중</span>
                )}
              </div>
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', color: 'var(--white-dim)' }}>
              {new Date(q.started_at).toLocaleDateString('ko-KR')}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', color: q.ended_at ? 'var(--white-dim)' : 'rgba(201,168,76,0.4)' }}>
              {q.ended_at ? new Date(q.ended_at).toLocaleDateString('ko-KR') : '—'}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {!q.is_active && (
                <button onClick={() => activate(q.id)} disabled={isPending} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em',
                  padding: '0.3rem 0.7rem', border: '1px solid var(--gold)', color: 'var(--gold)',
                  background: 'transparent', cursor: 'pointer',
                }}>
                  활성화
                </button>
              )}
              {q.is_active && (
                <button onClick={() => close(q.id)} disabled={isPending} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em',
                  padding: '0.3rem 0.7rem', border: '1px solid rgba(255,200,0,0.5)', color: '#ffc800',
                  background: 'transparent', cursor: 'pointer',
                }}>
                  종료
                </button>
              )}
              <button onClick={() => deleteQ(q.id)} disabled={isPending} style={{
                fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em',
                padding: '0.3rem 0.7rem', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888',
                background: 'transparent', cursor: 'pointer',
              }}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
