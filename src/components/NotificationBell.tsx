'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Notif {
  id: string; title: string; message: string; type: string; read_at: string | null; created_at: string;
}

const TYPE_STYLE: Record<string, { color: string; icon: string }> = {
  info:    { color: '#60a5fa', icon: 'ℹ' },
  warning: { color: '#fb923c', icon: '⚠' },
  alert:   { color: '#f87171', icon: '🚨' },
  raffle:  { color: '#c9a84c', icon: '🎲' },
};

const TYPE_META: Record<string, { label: string; note: string }> = {
  info:    { label: 'NOTICE', note: '일반 안내 사항입니다.' },
  warning: { label: 'WARNING', note: '주의가 필요한 사항입니다.' },
  alert:   { label: 'ALERT', note: '즉각적인 확인이 필요합니다.' },
  raffle:  { label: 'RAFFLE', note: '추첨 관련 알림입니다.' },
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
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.15em', color: `${color}99`, flexShrink: 0, minWidth: '3rem' }}>
                {key}
              </span>
              <span style={{ width: 1, height: '0.8rem', background: `${color}30`, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'rgba(244,239,230,0.85)', lineHeight: 1.5 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotifModal({ notif, onClose }: { notif: Notif; onClose: () => void }) {
  const ts = TYPE_STYLE[notif.type] ?? TYPE_STYLE.info;
  const meta = TYPE_META[notif.type] ?? TYPE_META.info;
  const d = new Date(notif.created_at);
  const dateStr = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const content = (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0a1a0f', border: `1px solid ${ts.color}33`, maxWidth: 540, width: '100%', animation: 'fadeUp 0.2s ease', position: 'relative', overflow: 'hidden' }}
      >
        {/* 상단 컬러 바 */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${ts.color}, transparent)` }} />

        {/* 닫기 */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(244,239,230,0.25)', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}
        >✕</button>

        {/* 타입 배지 + 날짜 */}
        <div style={{ padding: '1.4rem 1.8rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.2em',
            color: ts.color, border: `1px solid ${ts.color}55`, padding: '0.18rem 0.6rem',
          }}>
            {meta.label}
          </span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'rgba(244,239,230,0.25)', letterSpacing: '0.08em' }}>
            {dateStr}
          </span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'rgba(244,239,230,0.18)' }}>
            {timeStr}
          </span>
        </div>

        {/* 제목 */}
        <div style={{ padding: '1rem 1.8rem 0' }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.55rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            lineHeight: 1.3,
            letterSpacing: '0.02em',
          }}>
            {notif.title}
          </h2>
        </div>

        {/* 구분선 */}
        <div style={{ margin: '1rem 1.8rem', height: 1, background: `linear-gradient(90deg, ${ts.color}44, rgba(201,168,76,0.08), transparent)` }} />

        {/* 본문 */}
        <div style={{ padding: '0 1.8rem 1.6rem' }}>
          <MessageBody message={notif.message} color={ts.color} />

          {/* 부가 설명 */}
          <div style={{ marginTop: '1.4rem', padding: '0.7rem 1rem', background: `${ts.color}08`, borderLeft: `2px solid ${ts.color}40` }}>
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.5rem',
              color: `${ts.color}bb`,
              letterSpacing: '0.1em',
              lineHeight: 1.6,
            }}>
              {meta.note}<br />
              <span style={{ color: 'rgba(244,239,230,0.2)', fontSize: '0.46rem' }}>
                자세한 내역은 프로필 &rsaquo; 메일함에서 확인하실 수 있습니다.
              </span>
            </p>
          </div>
        </div>

        {/* 하단 장식 */}
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', padding: '0.7rem 1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'rgba(201,168,76,0.25)', letterSpacing: '0.15em' }}>
            BGM — Boardgame in Melbourne
          </span>
          <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>{ts.icon}</span>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
  return createPortal(content, document.body);
}

export default function NotificationBell({ initialUnread, profileUsername }: { initialUnread: number; profileUsername: string }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<Notif | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && notifs.length === 0) {
      setLoading(true);
      const r = await fetch('/api/notifications');
      const d = await r.json();
      // 읽지 않은 것만 드롭다운에 표시 (읽은 건 프로필에서 확인)
      setNotifs(Array.isArray(d) ? d.filter((n: Notif) => !n.read_at) : []);
      setLoading(false);
    }
  }

  async function handleSelect(n: Notif) {
    // 읽음 처리
    if (!n.read_at) {
      await fetch('/api/notifications/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setUnread(prev => Math.max(0, prev - 1));
    }
    // 드롭다운에서 제거 (읽으면 사라짐)
    setNotifs(prev => prev.filter(x => x.id !== n.id));
    // 모달로 상세 표시
    setModal(n);
    setOpen(false);
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setNotifs([]);
    setUnread(0);
  }

  return (
    <>
      <div ref={ref} style={{ position: 'relative' }}>
        {/* 벨 버튼 */}
        <button
          onClick={handleOpen}
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--white-dim)', padding: 0 }}
        >
          🔔
          {unread > 0 && (
            <span style={{ position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, background: '#fb923c', borderRadius: '50%', fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* 드롭다운 */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: 320, maxHeight: 460,
            background: '#0e1f14', border: '1px solid rgba(201,168,76,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            animation: 'slideDown 0.15s ease',
          }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold)' }}>
                새 알림 {notifs.length > 0 && <span style={{ color: '#fb923c' }}>({notifs.length})</span>}
              </span>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {notifs.length > 0 && (
                  <button onClick={markAllRead} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', background: 'none', border: 'none', color: 'rgba(201,168,76,0.5)', cursor: 'pointer', padding: 0 }}>
                    전체 읽음
                  </button>
                )}
                <a href={`/profile/${profileUsername}`} onClick={() => setOpen(false)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', cursor: 'pointer', textDecoration: 'none' }}>
                  전체 보기 →
                </a>
              </div>
            </div>

            {/* 목록 */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading && (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', fontStyle: 'italic', padding: '1.5rem', textAlign: 'center', opacity: 0.5 }}>불러오는 중...</p>
              )}
              {!loading && notifs.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5, marginBottom: '0.6rem' }}>새 알림이 없습니다</p>
                  <a href={`/profile/${profileUsername}`} onClick={() => setOpen(false)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'rgba(201,168,76,0.4)', textDecoration: 'none' }}>
                    프로필에서 알림 기록 확인 →
                  </a>
                </div>
              )}
              {notifs.map(n => {
                const ts = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleSelect(n)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '0.75rem 1rem',
                      background: `${ts.color}0a`,
                      border: 'none', borderBottom: '1px solid rgba(201,168,76,0.06)',
                      borderLeft: `2px solid ${ts.color}`,
                      cursor: 'pointer', display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${ts.color}18`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${ts.color}0a`)}
                  >
                    <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '0.05rem' }}>{ts.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: ts.color, marginBottom: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {n.title}
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: ts.color, flexShrink: 0 }} />
                      </p>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'rgba(244,239,230,0.65)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {n.message}
                      </p>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: 'rgba(244,239,230,0.25)', marginTop: '0.25rem' }}>
                        {new Date(n.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* 알림 상세 모달 */}
      {modal && <NotifModal notif={modal} onClose={() => setModal(null)} />}
    </>
  );
}
