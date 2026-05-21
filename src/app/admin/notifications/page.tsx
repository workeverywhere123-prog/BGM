'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Player { id: string; nickname: string; username: string; }

const TYPE_OPTIONS = [
  { value: 'info',    label: 'ℹ 정보', color: '#60a5fa' },
  { value: 'warning', label: '⚠ 경고', color: '#fb923c' },
  { value: 'alert',   label: '🚨 위반/주의', color: '#f87171' },
  { value: 'raffle',  label: '🎲 추첨', color: 'var(--gold)' },
];

export default function AdminNotificationsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target: 'all' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

  useEffect(() => {
    fetch('/api/players/search?q=a').then(r => r.json()).then(d => setPlayers(d ?? [])).catch(() => {});
  }, []);

  async function searchPlayers(q: string) {
    setPlayerSearch(q);
    if (q.length < 1) { setPlayers([]); return; }
    const r = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    setPlayers(d ?? []);
  }

  async function handleSend() {
    if (!form.title || !form.message) return alert('제목과 내용을 입력하세요');
    if (form.target !== 'all' && !form.target) return alert('수신자를 선택하세요');
    setSending(true);
    const res = await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSending(false);
    if (!res.ok) { alert(d.error); return; }
    setSent(`✓ ${d.count}명에게 발송 완료`);
    setForm(prev => ({ ...prev, title: '', message: '' }));
    setTimeout(() => setSent(''), 4000);
  }

  const selectedType = TYPE_OPTIONS.find(t => t.value === form.type) ?? TYPE_OPTIONS[0];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link href="/admin" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', textDecoration: 'none', opacity: 0.5 }}>← 어드민</Link>
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.3rem', color: 'var(--gold)', margin: '0.5rem 0 2rem' }}>알림 발송</h1>

      <div style={{ padding: '1.5rem', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(30,74,52,0.1)' }}>
        {/* 발송 유형 */}
        <div style={{ marginBottom: '1.2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>알림 유형</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {TYPE_OPTIONS.map(t => (
              <button key={t.value} onClick={() => setForm(prev => ({ ...prev, type: t.value }))} style={{
                padding: '0.4rem 1rem', fontFamily: "'Cinzel', serif", fontSize: '0.6rem',
                border: `1px solid ${form.type === t.value ? t.color : 'rgba(201,168,76,0.15)'}`,
                background: form.type === t.value ? `${t.color}15` : 'transparent',
                color: form.type === t.value ? t.color : 'var(--white-dim)', cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* 수신 대상 */}
        <div style={{ marginBottom: '1.2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>수신 대상</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <button onClick={() => setForm(prev => ({ ...prev, target: 'all' }))} style={{
              padding: '0.4rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.6rem',
              border: `1px solid ${form.target === 'all' ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}`,
              background: form.target === 'all' ? 'rgba(201,168,76,0.1)' : 'transparent',
              color: form.target === 'all' ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer',
            }}>전체 플레이어</button>
            <button onClick={() => setForm(prev => ({ ...prev, target: '' }))} style={{
              padding: '0.4rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.6rem',
              border: `1px solid ${form.target !== 'all' ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}`,
              background: form.target !== 'all' ? 'rgba(201,168,76,0.1)' : 'transparent',
              color: form.target !== 'all' ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer',
            }}>특정 플레이어</button>
          </div>
          {form.target !== 'all' && (
            <div>
              <input
                value={playerSearch}
                onChange={e => searchPlayers(e.target.value)}
                placeholder="닉네임 또는 아이디 검색..."
                style={{ width: '100%', padding: '0.6rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.4rem' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
                {players.map(p => (
                  <button key={p.id} onClick={() => { setForm(prev => ({ ...prev, target: p.id })); setPlayerSearch(`${p.nickname} (@${p.username})`); setPlayers([]); }} style={{
                    padding: '0.5rem 0.9rem', textAlign: 'left', background: form.target === p.id ? 'rgba(201,168,76,0.1)' : 'rgba(30,74,52,0.2)',
                    border: `1px solid ${form.target === p.id ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.08)'}`,
                    cursor: 'pointer', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)',
                  }}>
                    {p.nickname} <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>@{p.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 제목 */}
        <div style={{ marginBottom: '0.8rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginBottom: '0.3rem', letterSpacing: '0.1em' }}>제목</p>
          <input
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="알림 제목..."
            style={{ width: '100%', padding: '0.6rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* 내용 */}
        <div style={{ marginBottom: '1.2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginBottom: '0.3rem', letterSpacing: '0.1em' }}>내용</p>
          <textarea
            value={form.message}
            onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
            placeholder="알림 내용을 입력하세요..."
            rows={4}
            style={{ width: '100%', padding: '0.6rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        {/* 미리보기 */}
        {(form.title || form.message) && (
          <div style={{ marginBottom: '1.2rem', padding: '0.8rem 1rem', border: `1px solid ${selectedType.color}33`, background: `${selectedType.color}08`, borderLeft: `3px solid ${selectedType.color}` }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: selectedType.color, marginBottom: '0.2rem' }}>미리보기</p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: selectedType.color, marginBottom: '0.2rem' }}>{form.title || '제목 없음'}</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--foreground)' }}>{form.message || '내용 없음'}</p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleSend} disabled={sending} style={{
            padding: '0.6rem 1.8rem', background: sending ? 'rgba(201,168,76,0.3)' : 'var(--gold)',
            border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.65rem',
            letterSpacing: '0.15em', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
          }}>
            {sending ? '발송 중...' : '발송'}
          </button>
          {sent && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#4ade80' }}>{sent}</span>}
        </div>
      </div>
    </div>
  );
}
