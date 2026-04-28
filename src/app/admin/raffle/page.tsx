'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Quarter { id: string; name: string; }
interface Raffle { id: string; name: string; prize: string; status: string; created_at: string; ends_at: string | null; }

export default function AdminRafflePage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [form, setForm] = useState({ name: '', prize: '', description: '', quarter_id: '', starts_at: '', ends_at: '' });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [raffleRes, quarterRes] = await Promise.all([
      fetch('/api/admin/raffles'),
      fetch('/api/admin/quarters-list'),
    ]);
    if (raffleRes.ok) setRaffles((await raffleRes.json()).raffles ?? []);
    if (quarterRes.ok) setQuarters((await quarterRes.json()).quarters ?? []);
  }

  async function handleCreate() {
    if (!form.name || !form.prize) return alert('이름과 상품을 입력하세요');
    setCreating(true);
    const payload = {
      ...form,
      quarter_id: form.quarter_id || undefined,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
    };
    const res = await fetch('/api/raffle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) { alert(d.error); return; }
    alert('추첨이 생성되고 전체 플레이어에게 알림이 발송됐습니다!');
    setForm({ name: '', prize: '', description: '', quarter_id: '', starts_at: '', ends_at: '' });
    setShowForm(false);
    loadData();
  }

  const statusLabel = (s: string) => {
    if (s === 'open') return { text: '모집중', color: '#4ade80' };
    if (s === 'closed') return { text: '마감', color: '#fb923c' };
    return { text: '완료', color: 'rgba(244,239,230,0.35)' };
  };

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.9rem', background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)',
    fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const,
    colorScheme: 'dark' as const,
  };
  const labelStyle = { fontFamily: "'Cinzel', serif" as const, fontSize: '0.55rem', color: 'var(--white-dim)' as const, marginBottom: '0.3rem', display: 'block' as const };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/admin" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', textDecoration: 'none', opacity: 0.5 }}>← 어드민</Link>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.3rem', color: 'var(--gold)', marginTop: '0.3rem' }}>추첨 관리</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Link href="/admin/notifications" style={{ padding: '0.6rem 1.2rem', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', textDecoration: 'none' }}>
            🔔 알림 발송
          </Link>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.6rem 1.4rem', background: 'var(--gold)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
            + 추첨 생성
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.05)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>새 추첨 만들기</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div><label style={labelStyle}>추첨명 *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="예: 2026 Q1 분기 추첨" style={inputStyle} /></div>
            <div><label style={labelStyle}>상품 *</label><input value={form.prize} onChange={e => setForm(p => ({ ...p, prize: e.target.value }))} placeholder="예: 스팀 기프트카드 $50" style={inputStyle} /></div>
            <div><label style={labelStyle}>설명 (선택)</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="추가 설명..." style={inputStyle} /></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
              <div>
                <label style={labelStyle}>참가 시작일 (선택)</label>
                <input type="datetime-local" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>참가 마감일 (선택)</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>분기 연결 (선택)</label>
              <select value={form.quarter_id} onChange={e => setForm(p => ({ ...p, quarter_id: e.target.value }))} style={{ ...inputStyle, fontFamily: "'Cinzel', serif" }}>
                <option value="">분기 미지정</option>
                {quarters.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </div>

            <div style={{ padding: '0.7rem 1rem', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', lineHeight: 1.7 }}>
              ✦ 추첨 생성 시 전체 플레이어에게 알림이 자동 발송됩니다
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
              <button onClick={handleCreate} disabled={creating} style={{ padding: '0.6rem 1.6rem', background: creating ? 'rgba(201,168,76,0.3)' : 'var(--gold)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer' }}>
                {creating ? '생성 중...' : '생성 + 알림 발송'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', cursor: 'pointer' }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {raffles.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
            추첨이 없습니다. 위 버튼으로 생성하세요.
          </div>
        )}
        {raffles.map(r => {
          const st = statusLabel(r.status);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem', border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(30,74,52,0.1)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: st.color, letterSpacing: '0.15em' }}>{st.text}</span>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--foreground)', marginTop: '0.15rem' }}>{r.name}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)' }}>🎁 {r.prize}</p>
                {r.ends_at && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: '#fb923c', marginTop: '0.2rem' }}>마감: {new Date(r.ends_at).toLocaleString('ko-KR')}</p>}
              </div>
              <Link href={`/raffle/${r.id}`} style={{ padding: '0.45rem 1rem', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', textDecoration: 'none' }}>
                상세 / 관리
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
