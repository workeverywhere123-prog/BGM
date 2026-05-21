'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Notice {
  id: string; title: string; content: string; category: string; is_pinned: boolean;
}

export default function NoticeEditClient({ notice }: { notice: Notice }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: notice.title, content: notice.content, category: notice.category, is_pinned: notice.is_pinned });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', background: 'rgba(11,34,24,0.8)', border: '1px solid var(--gold-dim)',
    color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif" as const, fontSize: '1rem',
    padding: '0.8rem 1.2rem', outline: 'none', marginTop: '0.4rem', boxSizing: 'border-box' as const,
  };
  const labelStyle: React.CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--white-dim)', display: 'block' };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch(`/api/admin/notice/${notice.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) { setError('저장에 실패했습니다'); return; }
    router.push('/admin/notice');
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return;
    setDeleting(true);
    await fetch(`/api/admin/notice/${notice.id}`, { method: 'DELETE' });
    router.push('/admin/notice');
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <Link href="/admin/notice" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', textDecoration: 'none', opacity: 0.5 }}>← 공지 목록</Link>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', marginTop: '0.3rem' }}>공지 수정</h1>
        </div>
        <button
          onClick={handleDelete} disabled={deleting}
          style={{ padding: '0.5rem 1.2rem', border: '1px solid rgba(255,100,100,0.35)', color: '#ff8888', background: 'transparent', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', cursor: 'pointer', letterSpacing: '0.1em' }}
        >
          {deleting ? '삭제 중...' : '🗑 공지 삭제'}
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={labelStyle}>카테고리</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="general">일반</option>
            <option value="important">중요</option>
            <option value="rule">규칙</option>
            <option value="event">이벤트</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>제목</label>
          <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>내용</label>
          <textarea
            required rows={20} value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.8 }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--white-dim)' }}>상단 고정</span>
        </label>

        {error && <p style={{ color: '#ff8888', fontFamily: "'Cinzel', serif", fontSize: '0.7rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? '저장 중...' : '저장'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => router.back()}>취소</button>
          <Link href={`/notice/${notice.id}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)', textDecoration: 'none', display: 'flex', alignItems: 'center', marginLeft: 'auto', opacity: 0.7 }}>
            공개 페이지 보기 →
          </Link>
        </div>
      </form>
    </div>
  );
}
