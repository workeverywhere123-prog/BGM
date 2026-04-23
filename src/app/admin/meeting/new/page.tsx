'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewMeetingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ number: '', held_at: '', note: '', status: 'upcoming' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/admin/meeting');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(11,34,24,0.8)', border: '1px solid var(--gold-dim)',
    color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem',
    padding: '0.8rem 1.2rem', outline: 'none', marginTop: '0.4rem',
  };
  const labelStyle = { fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--white-dim)', display: 'block' };

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', marginBottom: '2rem' }}>새 모임 만들기</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>모임 회차</label>
          <input type="number" placeholder="예: 15" required value={form.number}
            onChange={e => setForm(f => ({ ...f, number: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>모임 날짜</label>
          <input type="datetime-local" required value={form.held_at}
            onChange={e => setForm(f => ({ ...f, held_at: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>상태</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="upcoming">예정</option>
            <option value="active">진행중</option>
            <option value="closed">종료</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>메모 (선택)</label>
          <input type="text" placeholder="장소, 특이사항 등" value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={inputStyle} />
        </div>

        {error && <p style={{ color: '#ff8888', fontFamily: "'Cinzel', serif", fontSize: '0.7rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? '생성 중...' : '모임 생성'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => router.back()}>취소</button>
        </div>
      </form>
    </div>
  );
}
