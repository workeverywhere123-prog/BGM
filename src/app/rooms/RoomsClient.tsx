'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

/* ── Types ── */
interface Player { id: string; nickname: string; username: string; }
interface Room {
  id: string; title: string | null; location: string; scheduled_at: string;
  game_types: string[]; max_players: number; status: 'open' | 'full'; note: string | null;
  host_id: string; host: Player; members: Player[];
}

/* ── Constants ── */
const GAME_TYPES = ['마피아', '유로', '전략', '머더미스터리', '순위전', '협력', '파티', '덱빌딩', '워게임', '기타'];
const TYPE_COLOR: Record<string, string> = {
  '마피아': '#e879f9', '유로': '#60a5fa', '전략': '#4ade80', '머더미스터리': '#a78bfa',
  '순위전': '#c9a84c', '협력': '#34d399', '파티': '#fb923c', '덱빌딩': '#f87171',
  '워게임': '#94a3b8', '기타': 'rgba(244,239,230,0.5)',
};
const GRID_MIN = 6;

function fmtDate(iso: string) {
  const d = new Date(iso);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const mm = d.getMonth() + 1, dd = d.getDate(), dow = days[d.getDay()];
  const hh = d.getHours(), min = d.getMinutes().toString().padStart(2, '0');
  const ampm = hh < 12 ? '오전' : '오후';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${mm}/${dd} (${dow}) ${ampm} ${h12}:${min}`;
}

/* ─────────────────────────────────── */
export default function RoomsClient({
  initialRooms, currentUserId, currentUserNickname,
}: {
  initialRooms: Room[]; currentUserId: string | null; currentUserNickname: string | null;
}) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const isMember = (room: Room) => room.members.some(m => m.id === currentUserId);
  const isHost   = (room: Room) => room.host_id === currentUserId;

  /* ── Create ── */
  const handleCreate = (data: CreateData) => startTransition(async () => {
    const res = await fetch('/api/rooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    const room: Room = await res.json();
    setRooms(prev => [...prev, room]);
    setShowCreate(false);
  });

  /* ── Join ── */
  const handleJoin = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });
      setActionId(null);
      if (!res.ok) { alert((await res.json()).error); return; }
      const { player, status } = await res.json();
      setRooms(prev => prev.map(r => r.id === id
        ? { ...r, members: [...r.members, player], status }
        : r
      ));
    });
  };

  /* ── Leave ── */
  const handleLeave = (id: string) => {
    setActionId(id);
    startTransition(async () => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
      setActionId(null);
      if (!res.ok) { alert((await res.json()).error); return; }
      setRooms(prev => prev.map(r => r.id === id
        ? { ...r, members: r.members.filter(m => m.id !== currentUserId), status: 'open' }
        : r
      ));
    });
  };

  /* ── Close ── */
  const handleClose = (id: string) => {
    if (!confirm('이 방을 닫으시겠습니까?')) return;
    setActionId(id);
    startTransition(async () => {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      setActionId(null);
      if (!res.ok) { alert((await res.json()).error); return; }
      setRooms(prev => prev.filter(r => r.id !== id));
    });
  };

  /* ── Grid slots ── */
  const filledCount  = rooms.length;
  const totalSlots   = Math.max(GRID_MIN, filledCount + (currentUserId ? 1 : 0));
  const emptySlots   = totalSlots - filledCount;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 8rem' }}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', padding: '2rem 0 3rem' }}>
        <p className="section-label">OPEN GAME ROOM</p>
        <h1 className="section-title">보드게임방</h1>
        <div className="section-divider" />
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic', marginTop: '-0.5rem' }}>
          방을 개설하고 함께 플레이할 멤버를 모집하세요
        </p>
      </div>

      {/* ── 3×2 Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.2rem',
      }}>
        {rooms.map(room => (
          <RoomCard key={room.id} room={room}
            isMember={isMember(room)} isHost={isHost(room)}
            loading={isPending && actionId === room.id}
            currentUserId={currentUserId}
            onJoin={() => handleJoin(room.id)}
            onLeave={() => handleLeave(room.id)}
            onClose={() => handleClose(room.id)}
          />
        ))}

        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`}
            onClick={currentUserId ? () => setShowCreate(true) : undefined}
            isLoggedIn={!!currentUserId}
          />
        ))}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          isPending={isPending}
          currentUserNickname={currentUserNickname ?? ''}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────── */
/* Room Card                           */
/* ─────────────────────────────────── */
function RoomCard({ room, isMember, isHost, loading, currentUserId, onJoin, onLeave, onClose }: {
  room: Room; isMember: boolean; isHost: boolean; loading: boolean;
  currentUserId: string | null;
  onJoin: () => void; onLeave: () => void; onClose: () => void;
}) {
  const isFull = room.status === 'full' && !isMember;

  return (
    <div style={{
      border: `1px solid ${isMember ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`,
      background: isMember ? 'rgba(30,74,52,0.25)' : 'rgba(22,53,36,0.2)',
      padding: '1.6rem',
      display: 'flex', flexDirection: 'column', gap: '0.8rem',
      minHeight: 280,
      position: 'relative',
      transition: 'border-color 0.2s',
    }}>
      {/* Host badge */}
      {isHost && (
        <span style={{ position: 'absolute', top: '1rem', right: '1rem', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.15rem 0.45rem' }}>
          방장
        </span>
      )}

      {/* Game type tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {room.game_types.length === 0
          ? <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.4 }}>게임 미정</span>
          : room.game_types.map(t => (
            <span key={t} style={{
              fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em',
              padding: '0.15rem 0.5rem',
              border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold-dim)'}55`,
              color: TYPE_COLOR[t] ?? 'var(--gold-dim)',
              background: `${TYPE_COLOR[t] ?? 'var(--gold)'}10`,
            }}>{t}</span>
          ))
        }
      </div>

      {/* Title */}
      <div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', color: 'var(--foreground)', lineHeight: 1.2 }}>
          {room.title || `${room.host.nickname}의 방`}
        </p>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', marginTop: '0.2rem' }}>
          by {room.host.nickname}
        </p>
      </div>

      {/* Location + time */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)' }}>
          📍 {room.location}
        </p>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--white-dim)' }}>
          {fmtDate(room.scheduled_at)}
        </p>
      </div>

      {room.note && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.6 }}>
          {room.note}
        </p>
      )}

      {/* Members */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {room.members.map(m => (
              <Link href={`/profile/${m.username}`} key={m.id}
                title={m.nickname}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: `1.5px solid ${m.id === room.host_id ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`,
                  background: 'rgba(30,74,52,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)',
                  textDecoration: 'none', flexShrink: 0,
                }}>
                {m.nickname[0]}
              </Link>
            ))}
          </div>
          <span style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.1em',
            color: room.status === 'full' ? '#ff8888' : 'var(--gold)',
            border: `1px solid ${room.status === 'full' ? 'rgba(255,100,100,0.4)' : 'rgba(201,168,76,0.3)'}`,
            padding: '0.15rem 0.5rem',
          }}>
            {room.members.length} / {room.max_players}명
          </span>
        </div>

        {/* Action button */}
        {!currentUserId ? (
          <Link href="/login" style={btnStyle('dim')}>로그인 후 참가</Link>
        ) : isHost ? (
          <button onClick={onClose} disabled={loading} style={btnStyle('danger')}>
            {loading ? '...' : '방 닫기'}
          </button>
        ) : isMember ? (
          <button onClick={onLeave} disabled={loading} style={btnStyle('ghost')}>
            {loading ? '...' : '나가기'}
          </button>
        ) : isFull ? (
          <button disabled style={btnStyle('disabled')}>방이 꽉 찼습니다</button>
        ) : (
          <button onClick={onJoin} disabled={loading} style={btnStyle('gold')}>
            {loading ? '...' : '참가하기'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── */
/* Empty Slot                          */
/* ─────────────────────────────────── */
function EmptySlot({ onClick, isLoggedIn }: { onClick?: () => void; isLoggedIn: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!isLoggedIn}
      style={{
        border: '1px dashed rgba(201,168,76,0.2)',
        background: 'transparent',
        minHeight: 280,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '0.8rem', cursor: isLoggedIn ? 'pointer' : 'default',
        transition: 'all 0.2s',
        padding: '1.6rem',
      }}
      onMouseEnter={e => { if (isLoggedIn) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.5)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.2)'; }}
    >
      <span style={{ fontSize: '2rem', color: 'rgba(201,168,76,0.2)', lineHeight: 1 }}>+</span>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.2em', color: 'var(--white-dim)', opacity: isLoggedIn ? 0.5 : 0.25 }}>
        {isLoggedIn ? '방 개설하기' : '로그인 필요'}
      </span>
    </button>
  );
}

/* ─────────────────────────────────── */
/* Create Modal                        */
/* ─────────────────────────────────── */
interface CreateData {
  title?: string; location: string; scheduled_at: string;
  game_types: string[]; max_players: number; note?: string;
}

function CreateModal({ onClose, onCreate, isPending, currentUserNickname }: {
  onClose: () => void; onCreate: (d: CreateData) => void;
  isPending: boolean; currentUserNickname: string;
}) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const timeStr = '19:00';

  const [title, setTitle]         = useState('');
  const [location, setLocation]   = useState('');
  const [date, setDate]           = useState(dateStr);
  const [time, setTime]           = useState(timeStr);
  const [gameTypes, setGameTypes] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [note, setNote]           = useState('');
  const [customType, setCustomType] = useState('');

  const toggleType = (t: string) => {
    setGameTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const addCustom = () => {
    const v = customType.trim();
    if (v && !gameTypes.includes(v)) setGameTypes(prev => [...prev, v]);
    setCustomType('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !date || !time) return;
    onCreate({
      title: title || undefined,
      location,
      scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
      game_types: gameTypes,
      max_players: maxPlayers,
      note: note || undefined,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(11,34,24,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)',
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        padding: '2.5rem',
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.25em', color: 'var(--gold-dim)' }}>OPEN ROOM</p>
            <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', lineHeight: 1 }}>방 개설하기</h2>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', marginTop: '0.2rem' }}>
              방장: {currentUserNickname}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

          {/* Title */}
          <Field label="방 이름 (선택)">
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={`${currentUserNickname}의 방`}
              style={inputStyle} />
          </Field>

          {/* Game types */}
          <Field label="게임 종류">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {GAME_TYPES.map(t => (
                <button key={t} type="button" onClick={() => toggleType(t)} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em',
                  padding: '0.3rem 0.7rem', cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${gameTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
                  background: gameTypes.includes(t) ? `${TYPE_COLOR[t] ?? 'var(--gold)'}18` : 'transparent',
                  color: gameTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'var(--white-dim)',
                }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input value={customType} onChange={e => setCustomType(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); }}}
                placeholder="직접 입력 후 Enter"
                style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={addCustom}
                style={{ ...inputStyle, width: 'auto', padding: '0 0.8rem', cursor: 'pointer', color: 'var(--gold)' }}>
                추가
              </button>
            </div>
            {gameTypes.length > 0 && (
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {gameTypes.map(t => (
                  <span key={t} onClick={() => toggleType(t)} style={{
                    fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.15rem 0.5rem',
                    border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold)'}66`,
                    color: TYPE_COLOR[t] ?? 'var(--gold)', cursor: 'pointer',
                    background: `${TYPE_COLOR[t] ?? 'var(--gold)'}15`,
                  }}>
                    {t} ✕
                  </span>
                ))}
              </div>
            )}
          </Field>

          {/* Location */}
          <Field label="모임 장소 *">
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="예: 강남 스타벅스 2층, 홍대 보드카페"
              required style={inputStyle} />
          </Field>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <Field label="날짜 *">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="시간 *">
              <input type="time" value={time} onChange={e => setTime(e.target.value)} required style={inputStyle} />
            </Field>
          </div>

          {/* Max players */}
          <Field label="최대 인원">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => setMaxPlayers(n)} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.68rem',
                  width: 36, height: 36, border: `1px solid ${maxPlayers === n ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
                  background: maxPlayers === n ? 'rgba(201,168,76,0.12)' : 'transparent',
                  color: maxPlayers === n ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </Field>

          {/* Note */}
          <Field label="메모 (선택)">
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="레벨 무관, 초보 환영 등"
              style={inputStyle} />
          </Field>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.4rem' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
              padding: '0.8rem', border: '1px solid rgba(201,168,76,0.2)',
              background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer',
            }}>
              취소
            </button>
            <button type="submit" disabled={isPending || !location} style={{
              flex: 2, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
              padding: '0.8rem', border: 'none',
              background: (!location || isPending) ? 'rgba(201,168,76,0.3)' : 'var(--gold)',
              color: '#0b2218', cursor: (!location || isPending) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}>
              {isPending ? '개설 중...' : '방 개설'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.57rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.5rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.9rem', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.25)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem',
  outline: 'none',
};

function btnStyle(variant: 'gold' | 'ghost' | 'danger' | 'dim' | 'disabled'): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'block', width: '100%', padding: '0.55rem',
    fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em',
    cursor: variant === 'disabled' ? 'not-allowed' : 'pointer',
    border: 'none', textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s',
  };
  const variants = {
    gold:     { background: 'var(--gold)', color: '#0b2218', fontWeight: 600 },
    ghost:    { background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--white-dim)' },
    danger:   { background: 'rgba(255,100,100,0.12)', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888' },
    dim:      { background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--white-dim)', opacity: 0.6 },
    disabled: { background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)', color: 'var(--white-dim)', opacity: 0.4 },
  };
  return { ...base, ...variants[variant] } as React.CSSProperties;
}
