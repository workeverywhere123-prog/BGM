'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewNoticePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', content: '', category: 'general', is_pinned: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/admin/notice');
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
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', marginBottom: '2rem' }}>공지 작성</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>카테고리</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="general">일반</option>
            <option value="important">중요</option>
            <option value="rule">규칙</option>
            <option value="event">이벤트</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>제목</label>
          <input type="text" required placeholder="공지 제목을 입력하세요" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>내용</label>
          <textarea required rows={10} placeholder="공지 내용을 입력하세요" value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_pinned}
            onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--white-dim)' }}>상단 고정</span>
        </label>

        {error && <p style={{ color: '#ff8888', fontFamily: "'Cinzel', serif", fontSize: '0.7rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? '등록 중...' : '공지 등록'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => router.back()}>취소</button>
        </div>
      </form>
    </div>
  );
}
