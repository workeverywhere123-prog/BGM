'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Message {
  id: string;
  player_id: string;
  content: string;
  created_at: string;
  player: { nickname: string; username: string };
}

interface Props {
  roomId?: string;
  leagueId?: string;
  currentUserId: string | null;
  currentUserNickname: string | null;
}

function timeFmt(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes().toString().padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dateFmt(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export default function FloatingChatBox({ roomId, leagueId, currentUserId, currentUserNickname }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiBase = roomId ? `/api/rooms/${roomId}/messages` : `/api/league/${leagueId}/messages`;
  const table = roomId ? 'room_messages' : 'league_messages';
  const filterCol = roomId ? 'room_id' : 'league_id';
  const filterVal = (roomId ?? leagueId)!;

  const scrollBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    fetch(apiBase)
      .then(r => r.json())
      .then((data: Message[]) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [apiBase]);

  useEffect(() => {
    if (loaded && open) { scrollBottom(false); setUnread(0); }
  }, [loaded, open, scrollBottom]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase
      .channel(`fchat-${filterVal}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table,
        filter: `${filterCol}=eq.${filterVal}`,
      }, async (payload) => {
        const row = payload.new as { id: string; player_id: string; content: string; created_at: string };
        const { data: p } = await supabase.from('players').select('id, nickname, username').eq('id', row.player_id).single();
        const msg: Message = { ...row, player: p ?? { nickname: '?', username: '' } };
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        setUnread(n => n + 1);
        setTimeout(() => scrollBottom(true), 60);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filterVal, table, filterCol, scrollBottom]);

  const handleOpen = () => { setOpen(true); setUnread(0); setTimeout(() => scrollBottom(false), 80); };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !currentUserId) return;
    setSending(true); setInput('');
    try {
      await fetch(apiBase, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const playerColor = (id: string) => {
    const colors = ['#c9a84c', '#60a5fa', '#4ade80', '#e879f9', '#fb923c', '#34d399', '#a78bfa', '#f87171'];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  };

  return (
    <div style={{
      position: 'fixed',
      right: '1.2rem',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '0.5rem',
    }}>
      {/* Chat panel */}
      <div style={{
        width: 260,
        height: open ? 360 : 0,
        overflow: 'hidden',
        border: open ? '1px solid rgba(201,168,76,0.25)' : 'none',
        background: 'rgba(8,20,14,0.97)',
        backdropFilter: 'blur(12px)',
        boxShadow: open ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.08)' : 'none',
        display: 'flex', flexDirection: 'column',
        transition: 'height 0.25s cubic-bezier(0.4,0,0.2,1), border 0.2s, box-shadow 0.2s',
      }}>
        {open && (
          <>
            {/* Header */}
            <div style={{ padding: '0.5rem 0.8rem', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 5px #4ade80aa' }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', flex: 1 }}>
                {roomId ? 'ROOM CHAT' : 'LEAGUE CHAT'}
              </span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(244,239,230,0.3)', fontSize: '0.9rem', lineHeight: 1, padding: '0 0.1rem' }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.1) transparent' }}>
              {!loaded && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'rgba(244,239,230,0.2)', letterSpacing: '0.15em' }}>불러오는 중...</span>
                </div>
              )}
              {loaded && messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.4rem', opacity: 0.35 }}>
                  <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.1rem', color: 'var(--gold)' }}>✦</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--white-dim)', textAlign: 'center', padding: '0 1rem' }}>
                    첫 번째 메시지를 남겨보세요
                  </span>
                </div>
              )}
              {loaded && messages.map((msg, i) => {
                const isMine = msg.player_id === currentUserId;
                const showDate = i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at);
                const isSameAuthor = i > 0 && messages[i - 1].player_id === msg.player_id && !showDate;
                const color = playerColor(msg.player_id);

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.6rem 0.8rem', opacity: 0.3 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.4rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>{dateFmt(msg.created_at)}</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.45rem', padding: isSameAuthor ? '0.08rem 0.8rem' : '0.4rem 0.8rem 0.08rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 22, flexShrink: 0 }}>
                        {!isSameAuthor && (
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: `${color}1a`, border: `1px solid ${color}55`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color,
                          }}>
                            {(msg.player.nickname[0] ?? '?').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {!isSameAuthor && (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.1rem' }}>
                            <Link href={`/profile/${msg.player.username}`} style={{ textDecoration: 'none' }}>
                              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.05em', color: isMine ? 'var(--gold)' : color }}>
                                {msg.player.nickname}
                              </span>
                            </Link>
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.4rem', color: 'rgba(244,239,230,0.2)' }}>{timeFmt(msg.created_at)}</span>
                          </div>
                        )}
                        <p style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: '0.88rem',
                          color: isMine ? 'rgba(244,239,230,0.92)' : 'rgba(244,239,230,0.72)',
                          lineHeight: 1.45, wordBreak: 'break-word', margin: 0,
                        }}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', padding: '0.5rem 0.6rem', flexShrink: 0 }}>
              {!currentUserId ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.3rem 0' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.82rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.3)' }}>대화 참여하려면</span>
                  <Link href="/login" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'var(--gold)', textDecoration: 'none', border: '1px solid rgba(201,168,76,0.3)', padding: '0.15rem 0.5rem' }}>로그인</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    maxLength={500}
                    placeholder="메시지..."
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.18)',
                      color: 'var(--foreground)',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '0.88rem',
                      padding: '0.35rem 0.6rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || sending}
                    style={{
                      fontFamily: "'Cinzel', serif", fontSize: '0.46rem', letterSpacing: '0.08em',
                      padding: '0.35rem 0.7rem',
                      background: input.trim() ? 'var(--gold)' : 'rgba(201,168,76,0.08)',
                      color: input.trim() ? '#0b2218' : 'rgba(201,168,76,0.25)',
                      border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                      fontWeight: 700, flexShrink: 0, transition: 'all 0.15s',
                    }}
                  >
                    {sending ? '···' : '→'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: open ? 'rgba(201,168,76,0.15)' : 'rgba(8,20,14,0.97)',
          border: `1px solid ${open ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.25)'}`,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem',
          position: 'relative',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
      >
        {open ? (
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: 'var(--gold)' }}>✕</span>
        ) : (
          <span>💬</span>
        )}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#4ade80', color: '#0b2218',
            fontFamily: "'Cinzel', serif", fontSize: '0.5rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', boxShadow: '0 0 6px #4ade8088',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
