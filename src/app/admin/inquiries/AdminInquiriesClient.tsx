'use client';

import { useState } from 'react';

interface Inquiry {
  id: string; title: string; message: string; status: string;
  admin_reply: string | null; replied_at: string | null; created_at: string;
  player: { nickname: string; username: string };
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  open:     { color: '#fb923c', label: '미답변' },
  answered: { color: '#4ade80', label: '답변 완료' },
  closed:   { color: 'rgba(244,239,230,0.3)', label: '종료' },
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0e1f14', border: '1px solid rgba(201,168,76,0.3)', maxWidth: 580, width: '100%', maxHeight: '85vh', overflowY: 'auto', animation: 'fadeUp 0.18s ease' }}>
        {children}
        <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    </div>
  );
}

export default function AdminInquiriesClient({ inquiries: initial }: { inquiries: Inquiry[] }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initial);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'answered'>('all');

  const displayed = filterStatus === 'all' ? inquiries : inquiries.filter(i => i.status === filterStatus);

  async function handleReply() {
    if (!reply.trim() || !selected) return;
    setSubmitting(true);
    const res = await fetch(`/api/admin/inquiries/${selected.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    });
    setSubmitting(false);
    if (!res.ok) { alert('오류가 발생했습니다'); return; }
    const now = new Date().toISOString();
    setInquiries(prev => prev.map(i => i.id === selected.id ? { ...i, admin_reply: reply, status: 'answered', replied_at: now } : i));
    setSelected(prev => prev ? { ...prev, admin_reply: reply, status: 'answered', replied_at: now } : prev);
    setReply('');
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem' }}>
        {[['all', '전체'], ['open', '미답변'], ['answered', '완료']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v as 'all' | 'open' | 'answered')} style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.35rem 0.9rem',
            border: `1px solid ${filterStatus === v ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
            background: filterStatus === v ? 'rgba(201,168,76,0.08)' : 'transparent',
            color: filterStatus === v ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {displayed.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.12)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.4 }}>문의가 없습니다</div>
        )}
        {displayed.map(q => {
          const st = STATUS_STYLE[q.status] ?? STATUS_STYLE.open;
          return (
            <div key={q.id} onClick={() => { setSelected(q); setReply(''); }} style={{
              padding: '1rem 1.2rem', cursor: 'pointer',
              border: `1px solid ${q.status === 'open' ? 'rgba(251,146,60,0.2)' : 'rgba(201,168,76,0.08)'}`,
              background: q.status === 'open' ? 'rgba(251,146,60,0.04)' : 'rgba(30,74,52,0.1)',
              borderLeft: `3px solid ${st.color}`, transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = q.status === 'open' ? 'rgba(251,146,60,0.04)' : 'rgba(30,74,52,0.1)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', padding: '0.08rem 0.45rem', border: `1px solid ${st.color}44`, color: st.color }}>{st.label}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--gold-dim)' }}>{q.player.nickname}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.3)' }}>@{q.player.username}</span>
                  </div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--foreground)', marginBottom: '0.2rem' }}>{q.title}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'rgba(244,239,230,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.message}</p>
                </div>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.25)', flexShrink: 0 }}>{fmtDate(q.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid rgba(201,168,76,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--gold-dim)' }}>{selected.player.nickname}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.3)' }}>@{selected.player.username}</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(244,239,230,0.3)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '0.82rem', color: 'var(--gold)', marginBottom: '0.4rem' }}>{selected.title}</h3>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.25)', marginBottom: '1rem' }}>{fmtDate(selected.created_at)}</p>
            <div style={{ padding: '1rem', background: 'rgba(30,74,52,0.2)', borderLeft: '2px solid rgba(201,168,76,0.2)', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'rgba(244,239,230,0.85)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
            </div>

            {selected.admin_reply && (
              <div style={{ padding: '1rem', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', marginBottom: '1.2rem' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#4ade80', marginBottom: '0.5rem' }}>기존 답변 · {selected.replied_at ? fmtDate(selected.replied_at) : ''}</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'rgba(244,239,230,0.8)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.admin_reply}</p>
              </div>
            )}

            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>
              {selected.admin_reply ? '답변 수정' : '답변 작성'}
            </p>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="답변 내용을 작성하세요..."
              rows={4}
              style={{ width: '100%', padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.8rem' }}
            />
            <button onClick={handleReply} disabled={submitting || !reply.trim()} style={{ padding: '0.6rem 1.6rem', background: submitting || !reply.trim() ? 'rgba(201,168,76,0.3)' : 'var(--gold)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 700, cursor: submitting || !reply.trim() ? 'not-allowed' : 'pointer' }}>
              {submitting ? '전송 중...' : '답변 전송'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
