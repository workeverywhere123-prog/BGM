'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Notif {
  id: string; title: string; message: string; type: string; read_at: string | null; created_at: string;
}
interface Inquiry {
  id: string; title: string; message: string; status: string; admin_reply: string | null; replied_at: string | null; created_at: string;
}

const TYPE_STYLE: Record<string, { color: string; icon: string; label: string }> = {
  info:    { color: '#60a5fa', icon: 'ℹ', label: 'NOTICE' },
  warning: { color: '#fb923c', icon: '⚠', label: 'WARNING' },
  alert:   { color: '#f87171', icon: '🚨', label: 'ALERT' },
  raffle:  { color: '#c9a84c', icon: '🎲', label: 'RAFFLE' },
};

const TYPE_NOTE: Record<string, string> = {
  info:    '일반 안내 사항입니다.',
  warning: '주의가 필요한 사항입니다.',
  alert:   '즉각적인 확인이 필요합니다.',
  raffle:  '추첨 관련 알림입니다.',
};

function MessageBody({ message, color }: { message: string; color: string }) {
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  const bodyLines: string[] = [];
  const metaLines: { key: string; value: string }[] = [];
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < 8) {
      metaLines.push({ key: line.slice(0, colonIdx).trim(), value: line.slice(colonIdx + 1).trim() });
    } else {
      bodyLines.push(line);
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {bodyLines.length > 0 && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'rgba(244,239,230,0.88)', lineHeight: 1.85, letterSpacing: '0.01em' }}>
          {bodyLines.join(' ')}
        </p>
      )}
      {metaLines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {metaLines.map(({ key, value }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.15em', color: `${color}99`, flexShrink: 0, minWidth: '3rem' }}>{key}</span>
              <span style={{ width: 1, height: '0.8rem', background: `${color}30`, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'rgba(244,239,230,0.85)', lineHeight: 1.5 }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  open:     { color: '#60a5fa', label: '답변 대기' },
  answered: { color: '#4ade80', label: '답변 완료' },
  closed:   { color: 'rgba(244,239,230,0.3)', label: '종료' },
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0e1f14', border: '1px solid rgba(201,168,76,0.3)', maxWidth: 540, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', animation: 'fadeUp 0.18s ease' }}
      >
        {children}
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
      </div>
    </div>
  );
}

export default function ProfileInbox({ initialNotifs, initialInquiries }: { initialNotifs: Notif[]; initialInquiries: Inquiry[] }) {
  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [activeTab, setActiveTab] = useState<'inbox' | 'inquiry'>('inbox');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedNotif, setSelectedNotif] = useState<Notif | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const unreadCount = notifs.filter(n => !n.read_at).length;
  const displayed = filter === 'unread' ? notifs.filter(n => !n.read_at) : notifs;

  const fmtDate = (iso: string) => {
    const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  async function handleSelectNotif(n: Notif) {
    setSelectedNotif(n);
    if (!n.read_at) {
      await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [n.id] }) });
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
    }
  }

  async function deleteNotif(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setNotifs(prev => prev.filter(x => x.id !== id));
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    setNotifs(prev => prev.map(x => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
  }

  async function submitInquiry() {
    if (!form.title || !form.message) return alert('제목과 내용을 입력하세요');
    setSubmitting(true);
    const res = await fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { alert(d.error); return; }
    setInquiries(prev => [d.inquiry, ...prev]);
    setForm({ title: '', message: '' });
    setShowInquiryForm(false);
  }

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.9rem', background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)',
    fontFamily: "'Cormorant Garamond', serif" as const, fontSize: '1rem',
    outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ marginTop: '3rem', borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '2.5rem' }}>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 2, marginBottom: '1.5rem', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        {[
          { key: 'inbox', label: `받은 알림${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { key: 'inquiry', label: `문의사항${inquiries.length > 0 ? ` (${inquiries.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as 'inbox' | 'inquiry')} style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.12em',
            padding: '0.6rem 1.2rem', border: 'none', background: 'transparent', cursor: 'pointer',
            color: activeTab === t.key ? 'var(--gold)' : 'var(--white-dim)',
            borderBottom: `2px solid ${activeTab === t.key ? 'var(--gold)' : 'transparent'}`,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── 받은 알림 탭 ── */}
      {activeTab === 'inbox' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.8rem' }}>
            {['all', 'unread'].map(f => (
              <button key={f} onClick={() => setFilter(f as 'all' | 'unread')} style={{
                fontFamily: "'Cinzel', serif", fontSize: '0.5rem', padding: '0.3rem 0.8rem',
                border: `1px solid ${filter === f ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
                background: filter === f ? 'rgba(201,168,76,0.07)' : 'transparent',
                color: filter === f ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer',
              }}>{f === 'all' ? '전체' : '미읽음'}</button>
            ))}
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', padding: '0.3rem 0.8rem', border: '1px solid rgba(201,168,76,0.12)', background: 'transparent', color: 'rgba(201,168,76,0.4)', cursor: 'pointer' }}>전체 읽음</button>
            )}
          </div>

          <div style={{ border: '1px solid rgba(201,168,76,0.1)', overflow: 'hidden' }}>
            {displayed.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.4 }}>
                {filter === 'unread' ? '미읽은 알림이 없습니다' : '알림이 없습니다'}
              </div>
            )}
            {displayed.map(n => {
              const ts = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
              const isUnread = !n.read_at;
              return (
                <div key={n.id} onClick={() => handleSelectNotif(n)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                  cursor: 'pointer', background: isUnread ? `${ts.color}07` : 'transparent',
                  borderBottom: '1px solid rgba(201,168,76,0.07)',
                  borderLeft: `3px solid ${isUnread ? ts.color : 'transparent'}`,
                  position: 'relative', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = isUnread ? `${ts.color}07` : 'transparent'}
                >
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{ts.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.1rem' }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: isUnread ? 'var(--foreground)' : 'rgba(244,239,230,0.4)', fontWeight: isUnread ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                      <span suppressHydrationWarning style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.25)', flexShrink: 0 }}>{fmtDate(n.created_at)}</span>
                    </div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'rgba(244,239,230,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                  </div>
                  {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: ts.color, flexShrink: 0 }} />}
                  <button onClick={e => deleteNotif(n.id, e)} style={{ background: 'none', border: 'none', color: 'rgba(244,239,230,0.15)', cursor: 'pointer', fontSize: '0.65rem', padding: '0.2rem 0.4rem', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(244,239,230,0.15)'}>✕</button>
                </div>
              );
            })}
          </div>
          {notifs.length > 0 && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.2)', marginTop: '0.5rem', textAlign: 'right' }}>총 {notifs.length}개</p>}
        </>
      )}

      {/* ── 문의사항 탭 ── */}
      {activeTab === 'inquiry' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
            <button onClick={() => setShowInquiryForm(!showInquiryForm)} style={{ padding: '0.5rem 1.2rem', background: showInquiryForm ? 'transparent' : 'var(--gold)', border: showInquiryForm ? '1px solid rgba(201,168,76,0.3)' : 'none', color: showInquiryForm ? 'var(--white-dim)' : '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', fontWeight: 700, cursor: 'pointer' }}>
              {showInquiryForm ? '취소' : '+ 문의 작성'}
            </button>
          </div>

          {showInquiryForm && (
            <div style={{ padding: '1.2rem', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)', marginBottom: '1rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>관리자 문의</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="제목" style={inputStyle} />
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="문의 내용을 작성하세요..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                <button onClick={submitInquiry} disabled={submitting} style={{ alignSelf: 'flex-end', padding: '0.55rem 1.4rem', background: submitting ? 'rgba(201,168,76,0.3)' : 'var(--gold)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? '전송 중...' : '전송'}
                </button>
              </div>
            </div>
          )}

          <div style={{ border: '1px solid rgba(201,168,76,0.1)', overflow: 'hidden' }}>
            {inquiries.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.4 }}>
                문의 내역이 없습니다
              </div>
            )}
            {inquiries.map(q => {
              const st = STATUS_STYLE[q.status] ?? STATUS_STYLE.open;
              return (
                <div key={q.id} onClick={() => setSelectedInquiry(q)} style={{ padding: '0.9rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(201,168,76,0.07)', borderLeft: `3px solid ${q.status === 'answered' ? '#4ade80' : 'rgba(201,168,76,0.15)'}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--foreground)', flex: 1 }}>{q.title}</p>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', padding: '0.1rem 0.5rem', border: `1px solid ${st.color}44`, color: st.color }}>{st.label}</span>
                      <span suppressHydrationWarning style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.25)' }}>{fmtDate(q.created_at)}</span>
                    </div>
                  </div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'rgba(244,239,230,0.4)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.message}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 알림 모달 ── */}
      {selectedNotif && typeof document !== 'undefined' && createPortal((() => {
        const ts = TYPE_STYLE[selectedNotif.type] ?? TYPE_STYLE.info;
        const note = TYPE_NOTE[selectedNotif.type] ?? TYPE_NOTE.info;
        const d = new Date(selectedNotif.created_at);
        const dateStr = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        return (
          <div onClick={() => setSelectedNotif(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#0a1a0f', border: `1px solid ${ts.color}33`, maxWidth: 540, width: '100%', animation: 'fadeUp 0.2s ease', position: 'relative', overflow: 'hidden' }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${ts.color}, transparent)` }} />
              <button onClick={() => setSelectedNotif(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(244,239,230,0.25)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
              <div style={{ padding: '1.4rem 1.8rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.2em', color: ts.color, border: `1px solid ${ts.color}55`, padding: '0.18rem 0.6rem' }}>{ts.label}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'rgba(244,239,230,0.25)', letterSpacing: '0.08em' }}>{dateStr}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'rgba(244,239,230,0.18)' }}>{timeStr}</span>
              </div>
              <div style={{ padding: '1rem 1.8rem 0' }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.55rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3, letterSpacing: '0.02em' }}>{selectedNotif.title}</h2>
              </div>
              <div style={{ margin: '1rem 1.8rem', height: 1, background: `linear-gradient(90deg, ${ts.color}44, rgba(201,168,76,0.08), transparent)` }} />
              <div style={{ padding: '0 1.8rem 1.6rem' }}>
                <MessageBody message={selectedNotif.message} color={ts.color} />
                <div style={{ marginTop: '1.4rem', padding: '0.7rem 1rem', background: `${ts.color}08`, borderLeft: `2px solid ${ts.color}40` }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: `${ts.color}bb`, letterSpacing: '0.1em', lineHeight: 1.6 }}>
                    {note}<br />
                    <span style={{ color: 'rgba(244,239,230,0.2)', fontSize: '0.46rem' }}>관련 내용은 아래 문의사항 탭에서 관리자에게 문의하실 수 있습니다.</span>
                  </p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', padding: '0.7rem 1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'rgba(201,168,76,0.25)', letterSpacing: '0.15em' }}>BGM — Boardgame in Melbourne</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>{ts.icon}</span>
              </div>
            </div>
            <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }`}</style>
          </div>
        );
      })(), document.body)}

      {/* ── 문의 모달 ── */}
      {selectedInquiry && typeof document !== 'undefined' && createPortal((() => {
        const st = STATUS_STYLE[selectedInquiry.status] ?? STATUS_STYLE.open;
        return (
          <div onClick={() => setSelectedInquiry(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#0e1f14', border: '1px solid rgba(201,168,76,0.3)', maxWidth: 540, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', animation: 'fadeUp 0.18s ease' }}>
              <div style={{ padding: '0.8rem 1.2rem', borderBottom: '1px solid rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', padding: '0.1rem 0.5rem', border: `1px solid ${st.color}44`, color: st.color }}>{st.label}</span>
                <button onClick={() => setSelectedInquiry(null)} style={{ background: 'none', border: 'none', color: 'rgba(244,239,230,0.3)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>{selectedInquiry.title}</h3>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'rgba(244,239,230,0.25)', marginBottom: '1rem' }}>{new Date(selectedInquiry.created_at).toLocaleString('ko-KR')}</p>
                <div style={{ padding: '1rem', background: 'rgba(30,74,52,0.2)', borderLeft: '2px solid rgba(201,168,76,0.2)', marginBottom: '1.2rem' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'rgba(244,239,230,0.8)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedInquiry.message}</p>
                </div>
                {selectedInquiry.admin_reply && (
                  <div style={{ padding: '1rem', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderLeft: '2px solid #4ade80' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#4ade80', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>관리자 답변</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'rgba(244,239,230,0.85)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedInquiry.admin_reply}</p>
                    {selectedInquiry.replied_at && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.25)', marginTop: '0.8rem' }}>{new Date(selectedInquiry.replied_at).toLocaleString('ko-KR')}</p>}
                  </div>
                )}
                {!selectedInquiry.admin_reply && (
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'rgba(244,239,230,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>답변 대기 중입니다</p>
                )}
              </div>
              <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
}
