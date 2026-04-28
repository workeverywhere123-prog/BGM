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
  height?: number;
}

function timeFmt(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes().toString().padStart(2, '0');
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

function dateFmt(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export default function ChatBox({ roomId, leagueId, currentUserId, currentUserNickname, height = 400 }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiBase = roomId ? `/api/rooms/${roomId}/messages` : `/api/league/${leagueId}/messages`;
  const table = roomId ? 'room_messages' : 'league_messages';
  const filterCol = roomId ? 'room_id' : 'league_id';
  const filterVal = (roomId ?? leagueId)!;

  const scrollBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Initial load
  useEffect(() => {
    fetch(apiBase)
      .then(r => r.json())
      .then((data: Message[]) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [apiBase]);

  // Scroll to bottom after initial load
  useEffect(() => {
    if (loaded) scrollBottom(false);
  }, [loaded, scrollBottom]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase
      .channel(`chat-${filterVal}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table,
        filter: `${filterCol}=eq.${filterVal}`,
      }, async (payload) => {
        const row = payload.new as { id: string; player_id: string; content: string; created_at: string };
        // Fetch player info if we don't have it
        const { data: p } = await supabase
          .from('players').select('id, nickname, username').eq('id', row.player_id).single();
        const newMsg: Message = {
          ...row,
          player: p ?? { nickname: '?', username: '' },
        };
        setMessages(prev => {
          // Deduplicate by id
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => scrollBottom(true), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filterVal, table, filterCol, scrollBottom]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !currentUserId) return;
    setSending(true);
    setInput('');
    try {
      await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Color palette for player avatars (consistent per player)
  const playerColor = (id: string) => {
    const colors = ['#c9a84c', '#60a5fa', '#4ade80', '#e879f9', '#fb923c', '#34d399', '#a78bfa', '#f87171'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(11,22,16,0.7)' }}>
      {/* Header */}
      <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.18em', color: 'var(--gold-dim)' }}>
          {roomId ? 'ROOM CHAT' : 'LEAGUE CHAT'} — 실시간 대화
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.2)' }}>
          {messages.length}개 메시지
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem 0', scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.15) transparent' }}>
        {!loaded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(244,239,230,0.2)', letterSpacing: '0.2em' }}>불러오는 중...</span>
          </div>
        )}
        {loaded && messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', opacity: 0.4 }}>
            <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.4rem', color: 'var(--gold)' }}>✦</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--white-dim)' }}>
              첫 번째 메시지를 남겨보세요
            </span>
          </div>
        )}
        {loaded && messages.map((msg, i) => {
          const isMine = msg.player_id === currentUserId;
          const showDate = i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at);
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const isSameAuthor = prevMsg && prevMsg.player_id === msg.player_id && !showDate;
          const color = playerColor(msg.player_id);

          return (
            <div key={msg.id}>
              {showDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.8rem 1rem', opacity: 0.35 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>{dateFmt(msg.created_at)}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
                </div>
              )}
              <div style={{
                display: 'flex', gap: '0.6rem', padding: isSameAuthor ? '0.1rem 1rem' : '0.5rem 1rem 0.1rem',
                alignItems: 'flex-start',
              }}>
                {/* Avatar */}
                <div style={{ width: 28, flexShrink: 0 }}>
                  {!isSameAuthor && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `${color}20`,
                      border: `1px solid ${color}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color,
                    }}>
                      {(msg.player.nickname[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!isSameAuthor && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.15rem' }}>
                      <Link href={`/profile/${msg.player.username}`} style={{ textDecoration: 'none' }}>
                        <span style={{
                          fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.06em',
                          color: isMine ? 'var(--gold)' : color,
                          fontWeight: isMine ? 600 : 400,
                        }}>
                          {msg.player.nickname}
                          {isMine && <span style={{ fontSize: '0.45rem', opacity: 0.6, marginLeft: '0.3rem' }}>나</span>}
                        </span>
                      </Link>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.25)' }}>{timeFmt(msg.created_at)}</span>
                    </div>
                  )}
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '1rem',
                    color: isMine ? 'rgba(244,239,230,0.9)' : 'rgba(244,239,230,0.75)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    margin: 0,
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
      <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', padding: '0.6rem 0.8rem', flexShrink: 0 }}>
        {!currentUserId ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', gap: '0.5rem' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.35)' }}>
              대화에 참여하려면
            </span>
            <Link href="/login" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--gold)', textDecoration: 'none', border: '1px solid rgba(201,168,76,0.3)', padding: '0.2rem 0.6rem' }}>
              로그인 →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: `${playerColor(currentUserId)}20`,
              border: `1px solid ${playerColor(currentUserId)}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: playerColor(currentUserId),
            }}>
              {(currentUserNickname?.[0] ?? '?').toUpperCase()}
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              maxLength={500}
              placeholder="메시지 입력... (Enter 전송)"
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--foreground)',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '1rem',
                padding: '0.4rem 0.7rem',
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{
                fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em',
                padding: '0.4rem 0.9rem',
                background: input.trim() ? 'var(--gold)' : 'rgba(201,168,76,0.1)',
                color: input.trim() ? '#0b2218' : 'rgba(201,168,76,0.3)',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s', flexShrink: 0,
                fontWeight: 600,
              }}
            >
              {sending ? '...' : '전송'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
