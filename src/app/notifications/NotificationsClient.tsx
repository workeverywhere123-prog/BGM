'use client';

import { useState } from 'react';

interface Notif {
  id: string; title: string; message: string; type: string; read_at: string | null; created_at: string;
}

const TYPE_STYLE: Record<string, { color: string; icon: string }> = {
  info:    { color: '#60a5fa', icon: 'ℹ' },
  warning: { color: '#fb923c', icon: '⚠' },
  alert:   { color: '#f87171', icon: '🚨' },
  raffle:  { color: 'var(--gold)', icon: '🎲' },
};

export default function NotificationsClient({ initialNotifs }: { initialNotifs: Notif[] }) {
  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs);

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function markRead(id: string) {
    await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  const unread = notifs.filter(n => !n.read_at).length;

  return (
    <div style={{ paddingTop: '7rem', minHeight: '100vh', maxWidth: 680, margin: '0 auto', padding: '7rem 1.5rem 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>BGM — NOTIFICATIONS</p>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: 'var(--gold)' }}>
            알림
            {unread > 0 && <span style={{ marginLeft: '0.6rem', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: '#fb923c' }}>{unread}개 미읽음</span>}
          </h1>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ padding: '0.5rem 1.2rem', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', cursor: 'pointer' }}>
            전체 읽음
          </button>
        )}
      </div>

      {notifs.length === 0 && (
        <div style={{ padding: '4rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
          알림이 없습니다
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {notifs.map(n => {
          const ts = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
          const isUnread = !n.read_at;
          return (
            <div
              key={n.id}
              onClick={() => isUnread && markRead(n.id)}
              style={{
                padding: '1rem 1.2rem', cursor: isUnread ? 'pointer' : 'default',
                border: `1px solid ${isUnread ? `${ts.color}33` : 'rgba(201,168,76,0.08)'}`,
                background: isUnread ? `${ts.color}08` : 'rgba(30,74,52,0.08)',
                borderLeft: `3px solid ${isUnread ? ts.color : 'rgba(201,168,76,0.1)'}`,
                transition: 'all 0.2s',
                opacity: isUnread ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{ts.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', color: isUnread ? ts.color : 'var(--white-dim)', marginBottom: '0.25rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {n.title}
                    {isUnread && <span style={{ width: 6, height: 6, background: ts.color, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />}
                  </p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)', lineHeight: 1.5 }}>{n.message}</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.35, marginTop: '0.4rem' }}>
                    {new Date(n.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
