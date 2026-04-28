'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import BoardlifeGamePicker, { type PickedGame } from '@/components/BoardlifeGamePicker';
import LapisIcon from '@/components/LapisIcon';

/* ── Types ── */
interface Player { id: string; nickname: string; username: string; avatar_url?: string | null; }
interface UserGame { id: string; name: string; thumbnail_url: string | null; }
interface RoomGame { boardlife_id: string; name: string; thumbnail_url: string | null; }
interface Room {
  id: string; title: string | null; location: string; scheduled_at: string;
  game_types: string[]; max_players: number; status: 'open' | 'full' | 'playing'; note: string | null;
  host_id: string; host: Player; members: Player[]; spectators: Player[];
  boardlife_game_id?: string | null; boardlife_game_name?: string | null; boardlife_game_thumb?: string | null;
  games_json?: RoomGame[];
  is_online: boolean;
}

/* ── Constants ── */
const GAME_TYPES = ['마피아', '유로', '전략', '머더미스터리', '순위전', '협력', '파티', '덱빌딩', '워게임', '기타'];
const TYPE_COLOR: Record<string, string> = {
  '마피아': '#e879f9', '유로': '#60a5fa', '전략': '#4ade80', '머더미스터리': '#a78bfa',
  '순위전': '#c9a84c', '협력': '#34d399', '파티': '#fb923c', '덱빌딩': '#f87171',
  '워게임': '#94a3b8', '기타': 'rgba(244,239,230,0.5)',
};
const GRID_MIN = 9;

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
  initialRooms, currentUserId, currentUserNickname, userGames,
}: {
  initialRooms: Room[];
  currentUserId: string | null;
  currentUserNickname: string | null;
  userGames: UserGame[];
}) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [showCreate, setShowCreate] = useState(false);
  const [joinRoom, setJoinRoom] = useState<Room | null>(null);
  const [closeRoom, setCloseRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
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

    // 가져올 게임 저장
    if (data.bring_game_ids?.length) {
      await fetch(`/api/rooms/${room.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_bring_games', bring_game_ids: data.bring_game_ids }),
      });
    }
  });

  /* ── Edit ── */
  const handleEdit = (roomId: string, data: Omit<CreateData, 'bring_game_ids' | 'boardlife_game_id' | 'boardlife_game_name' | 'boardlife_game_thumb'>) => startTransition(async () => {
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    const updated: Room = await res.json();
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updated, host: r.host, members: r.members, spectators: r.spectators } : r));
    setEditRoom(null);
  });

  /* ── Join (with game selection) ── */
  const handleJoinConfirm = (roomId: string, bringGameIds: string[]) => {
    setActionId(roomId);
    setJoinRoom(null);
    startTransition(async () => {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });
      setActionId(null);
      if (!res.ok) { alert((await res.json()).error); return; }
      const { player, status } = await res.json();
      setRooms(prev => prev.map(r => r.id === roomId
        ? { ...r, members: [...r.members, player], status }
        : r
      ));
      // 가져올 게임 저장
      if (bringGameIds.length) {
        await fetch(`/api/rooms/${roomId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_bring_games', bring_game_ids: bringGameIds }),
        });
      }
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

  /* ── Close (with no-show) ── */
  const handleCloseConfirm = (room: Room, noshowIds: string[]) => {
    setCloseRoom(null);
    setActionId(room.id);
    startTransition(async () => {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_with_noshow', noshow_ids: noshowIds }),
      });
      setActionId(null);
      if (!res.ok) { alert((await res.json()).error); return; }
      setRooms(prev => prev.filter(r => r.id !== room.id));
    });
  };

  /* ── Grid ── */
  const totalSlots = Math.max(GRID_MIN, rooms.length + (currentUserId ? 1 : 0));
  const emptySlots = totalSlots - rooms.length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem 8rem' }}>

      <div style={{ textAlign: 'center', padding: '2rem 0 3rem' }}>
        <p className="section-label">OPEN GAME ROOM</p>
        <h1 className="section-title">모임일정</h1>
        <div className="section-divider" />
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic', marginTop: '-0.5rem' }}>
          방을 개설하고 함께 플레이할 멤버를 모집하세요
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem' }}>
        {rooms.map(room => (
          <RoomCard key={room.id} room={room}
            isMember={isMember(room)} isHost={isHost(room)}
            loading={isPending && actionId === room.id}
            currentUserId={currentUserId}
            onJoin={() => userGames.length > 0 ? setJoinRoom(room) : handleJoinConfirm(room.id, [])}
            onLeave={() => handleLeave(room.id)}
            onClose={() => setCloseRoom(room)}
            onEdit={() => setEditRoom(room)}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`}
            onClick={currentUserId ? () => setShowCreate(true) : undefined}
            isLoggedIn={!!currentUserId}
          />
        ))}
      </div>

      {/* 방 개설 모달 */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          isPending={isPending}
          currentUserNickname={currentUserNickname ?? ''}
          userGames={userGames}
        />
      )}

      {/* 참가 모달 (게임 선택) */}
      {joinRoom && (
        <JoinModal
          room={joinRoom}
          userGames={userGames}
          onClose={() => setJoinRoom(null)}
          onConfirm={(ids) => handleJoinConfirm(joinRoom.id, ids)}
          isPending={isPending}
        />
      )}

      {/* 방 수정 모달 */}
      {editRoom && (
        <EditModal
          room={editRoom}
          onClose={() => setEditRoom(null)}
          onSave={(data) => handleEdit(editRoom.id, data)}
          isPending={isPending}
        />
      )}

      {/* 방 닫기 모달 (노쇼 선택) */}
      {closeRoom && (
        <CloseModal
          room={closeRoom}
          currentUserId={currentUserId!}
          onClose={() => setCloseRoom(null)}
          onConfirm={(noshowIds) => handleCloseConfirm(closeRoom, noshowIds)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────── */
/* KakaoTalk Share Helper              */
/* ─────────────────────────────────── */
function shareToKakao(room: Room) {
  const title = room.title || `${room.host.nickname}의 방`;
  const date = fmtDate(room.scheduled_at);
  const url = `${window.location.origin}/rooms/${room.id}`;
  const modeTag = room.is_online ? '🌐 온라인' : '📍 오프라인';
  const gameTag = room.game_types.length ? room.game_types.join(' · ') : '보드게임';
  const text =
    `🎲 BGM 보드게임 모임 모집!\n\n` +
    `📌 ${title}\n` +
    `🗂 ${gameTag}  ${modeTag}\n` +
    `📅 ${date}\n` +
    `📍 ${room.location}\n` +
    `👥 현재 인원: ${room.members.length}/${room.max_players}명\n` +
    (room.note ? `💬 ${room.note}\n` : '') +
    `\n▶ 참가하기: ${url}\n\n` +
    `#BGM #보드게임 #멜버른한인`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({ title: `[BGM] ${title}`, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      alert('모집 공고가 클립보드에 복사됐습니다!\n카카오톡 단톡방에 붙여넣기 하세요. 📋');
    }).catch(() => {
      prompt('아래 텍스트를 복사해 카카오톡에 붙여넣기 하세요:', text);
    });
  }
}

/* ─────────────────────────────────── */
/* Room Card                           */
/* ─────────────────────────────────── */
function RoomCard({ room, isMember, isHost, loading, currentUserId, onJoin, onLeave, onClose, onEdit }: {
  room: Room; isMember: boolean; isHost: boolean; loading: boolean;
  currentUserId: string | null;
  onJoin: () => void; onLeave: () => void; onClose: () => void; onEdit: () => void;
}) {
  const isFull = room.status === 'full' && !isMember;
  const isPlaying = room.status === 'playing';

  return (
    <div style={{
      border: `1px solid ${isPlaying ? 'rgba(251,146,60,0.25)' : isMember ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`,
      background: isPlaying ? 'rgba(40,25,10,0.35)' : isMember ? 'rgba(30,74,52,0.25)' : 'rgba(22,53,36,0.2)',
      padding: '1.6rem', paddingTop: '3rem', display: 'flex', flexDirection: 'column', gap: '0.8rem',
      minHeight: 280, position: 'relative', transition: 'border-color 0.2s',
    }}>
      {isPlaying && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', letterSpacing: '0.3em', color: 'rgba(251,146,60,0.15)', fontWeight: 700, textTransform: 'uppercase' }}>PLAYING</span>
        </div>
      )}
      {/* 온라인/오프라인 뱃지 */}
      <span style={{ position: 'absolute', top: '1rem', left: '1rem', fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.08em', padding: '0.12rem 0.4rem', border: `1px solid ${room.is_online ? 'rgba(96,165,250,0.4)' : 'rgba(74,222,128,0.4)'}`, color: room.is_online ? '#60a5fa' : '#4ade80', background: room.is_online ? 'rgba(96,165,250,0.07)' : 'rgba(74,222,128,0.07)' }}>
        {room.is_online ? '🌐 온라인' : '📍 오프라인'}
      </span>
      {isHost ? (
        <span style={{ position: 'absolute', top: '1rem', right: '1rem', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.15rem 0.45rem' }}>방장</span>
      ) : isPlaying ? (
        <span style={{ position: 'absolute', top: '1rem', right: '1rem', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)', padding: '0.15rem 0.45rem' }}>게임중</span>
      ) : null}
      {/* 선택된 게임 목록 (games_json 우선, 없으면 단일 boardlife_game_name) */}
      {(room.games_json?.length ?? 0) > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {room.games_json!.map(g => (
            <a key={g.boardlife_id} href={`https://boardlife.co.kr/game/${g.boardlife_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
              {g.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.thumbnail_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.85 }} />
              )}
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--gold)', fontStyle: 'italic', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{g.name}</span>
            </a>
          ))}
        </div>
      ) : room.boardlife_game_name ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {room.boardlife_game_thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={room.boardlife_game_thumb} alt="" style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.85 }} />
          )}
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--gold)', fontStyle: 'italic' }}>{room.boardlife_game_name}</span>
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {room.game_types.length === 0
          ? <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.4 }}>게임 미정</span>
          : room.game_types.map(t => (
            <span key={t} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em', padding: '0.15rem 0.5rem', border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold-dim)'}55`, color: TYPE_COLOR[t] ?? 'var(--gold-dim)', background: `${TYPE_COLOR[t] ?? 'var(--gold)'}10` }}>{t}</span>
          ))
        }
      </div>
      <div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', color: 'var(--foreground)', lineHeight: 1.2 }}>
          {room.title || `${room.host.nickname}의 방`}
        </p>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', marginTop: '0.2rem' }}>by {room.host.nickname}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)' }}>📍 {room.location}</p>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--white-dim)' }}>{fmtDate(room.scheduled_at)}</p>
      </div>
      {room.note && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.6 }}>{room.note}</p>}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {room.members.map(m => (
              <Link href={`/profile/${m.username}`} key={m.id} title={m.nickname} style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${m.id === room.host_id ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`, background: 'rgba(30,74,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)', textDecoration: 'none', flexShrink: 0, overflow: 'hidden' }}>
                {m.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.avatar_url} alt={m.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : m.nickname[0]
                }
              </Link>
            ))}
          </div>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.1em', color: isPlaying ? '#fb923c' : room.status === 'full' ? '#ff8888' : 'var(--gold)', border: `1px solid ${isPlaying ? 'rgba(251,146,60,0.4)' : room.status === 'full' ? 'rgba(255,100,100,0.4)' : 'rgba(201,168,76,0.3)'}`, padding: '0.15rem 0.5rem' }}>
            {isPlaying ? '게임중' : `${room.members.length} / ${room.max_players}명`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/rooms/${room.id}`} style={{ flex: 1, fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.4)', background: 'transparent', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', fontSize: '0.6rem', padding: '0.55rem 0' }}>
            상세 보기
          </Link>
          <button
            onClick={() => shareToKakao(room)}
            title="카카오톡으로 공유"
            style={{ padding: '0.55rem 0.65rem', background: '#FEE500', border: 'none', borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="12" cy="11.5" rx="10" ry="8.5" fill="#3C1E1E"/>
              <path d="M8.5 13c-.5-1-.3-3.5 3.5-3.5s4 2.5 3.5 3.5c-.4.8-3.5 3.8-3.5 4-.5-.2-3.1-3.2-3.5-4z" fill="#FEE500" opacity="0.15"/>
              <path d="M9 11.5q.6-2 3-2 2.4 0 3 2M10 13l1 2 1-1.5 1 1.5 1-2" stroke="#FEE500" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
          {isPlaying ? (
            <button disabled style={{ ...btnStyle('disabled'), flex: 1, opacity: 0.4 }}>게임 진행중</button>
          ) : !currentUserId ? (
            <Link href="/login" style={{ ...btnStyle('dim'), flex: 1 }}>로그인 후 참가</Link>
          ) : isHost ? (
            <>
              <button onClick={onEdit} disabled={loading} style={{ ...btnStyle('ghost'), flex: 1 }}>수정</button>
              <button onClick={onClose} disabled={loading} style={{ ...btnStyle('danger'), flex: 1 }}>{loading ? '...' : '방 닫기'}</button>
            </>
          ) : isMember ? (
            <button onClick={onLeave} disabled={loading} style={{ ...btnStyle('ghost'), flex: 1 }}>{loading ? '...' : '나가기'}</button>
          ) : isFull ? (
            <button disabled style={{ ...btnStyle('disabled'), flex: 1 }}>방이 꽉 찼습니다</button>
          ) : (
            <button onClick={onJoin} disabled={loading} style={{ ...btnStyle('gold'), flex: 1 }}>{loading ? '...' : '참가하기'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── */
/* Join Modal (게임 선택)               */
/* ─────────────────────────────────── */
function JoinModal({ room, userGames, onClose, onConfirm, isPending }: {
  room: Room; userGames: UserGame[];
  onClose: () => void; onConfirm: (ids: string[]) => void; isPending: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11,34,24,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 440, padding: '2rem' }}>
        <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.2rem', color: 'var(--foreground)', marginBottom: '0.4rem' }}>참가하기</h2>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', marginBottom: '1.5rem' }}>
          {room.title || `${room.host.nickname}의 방`} — {fmtDate(room.scheduled_at)}
        </p>

        {userGames.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
              가져갈 게임 선택 (선택 사항)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
              {userGames.map(g => (
                <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.5rem 0.8rem', background: selected.includes(g.id) ? 'rgba(201,168,76,0.08)' : 'none', border: `1px solid ${selected.includes(g.id) ? 'rgba(201,168,76,0.3)' : 'transparent'}`, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.includes(g.id)}
                    onChange={e => setSelected(prev => e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id))}
                    style={{ accentColor: 'var(--gold)', flexShrink: 0 }} />
                  {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', opacity: 0.8 }} />}
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)' }}>{g.name}</span>
                </label>
              ))}
            </div>
            {selected.length > 0 && (
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold)', marginTop: '0.5rem' }}>
                {selected.length}개 선택됨
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button onClick={onClose} style={{ flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', padding: '0.75rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer' }}>취소</button>
          <button onClick={() => onConfirm(selected)} disabled={isPending}
            style={{ flex: 2, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', padding: '0.75rem', border: 'none', background: 'var(--gold)', color: '#0b2218', fontWeight: 600, cursor: 'pointer' }}>
            {isPending ? '참가 중...' : '참가하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── */
/* Close Modal (노쇼 선택)              */
/* ─────────────────────────────────── */
function CloseModal({ room, currentUserId, onClose, onConfirm }: {
  room: Room; currentUserId: string;
  onClose: () => void; onConfirm: (noshowIds: string[]) => void;
}) {
  // 방장 제외 멤버만 노쇼 대상
  const others = room.members.filter(m => m.id !== currentUserId);
  const [showed, setShowed] = useState<string[]>(others.map(m => m.id)); // 기본 전원 참석

  const toggle = (id: string) => setShowed(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const noshowIds = others.filter(m => !showed.includes(m.id)).map(m => m.id);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11,34,24,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 400, padding: '2rem' }}>
        <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.2rem', color: 'var(--foreground)', marginBottom: '0.3rem' }}>방 닫기</h2>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', marginBottom: '1.5rem' }}>
          실제로 참석한 멤버를 체크하세요.<br/>
          <span style={{ color: '#f87171', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>노쇼 처리된 멤버는 -1 <LapisIcon size={12} /> LAPIS</span>
        </p>

        {others.length === 0 ? (
          <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--white-dim)', fontStyle: 'italic', marginBottom: '1.5rem' }}>참가 멤버가 없습니다</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '1.5rem' }}>
            {others.map(m => {
              const attended = showed.includes(m.id);
              return (
                <label key={m.id} onClick={() => toggle(m.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0.8rem', background: attended ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${attended ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`, cursor: 'pointer' }}>
                  <input type="checkbox" checked={attended} onChange={() => {}} style={{ accentColor: '#4ade80', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', flex: 1 }}>{m.nickname}</span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: attended ? '#4ade80' : '#f87171' }}>
                    {attended ? '참석' : '노쇼 -1'}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button onClick={onClose} style={{ flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', padding: '0.75rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer' }}>취소</button>
          <button onClick={() => onConfirm(noshowIds)}
            style={{ flex: 2, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', padding: '0.75rem', border: 'none', background: '#c0392b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            방 닫기 {noshowIds.length > 0 ? `(노쇼 ${noshowIds.length}명)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── */
/* Empty Slot                          */
/* ─────────────────────────────────── */
function EmptySlot({ onClick, isLoggedIn }: { onClick?: () => void; isLoggedIn: boolean }) {
  return (
    <button onClick={onClick} disabled={!isLoggedIn} style={{ border: '1px dashed rgba(201,168,76,0.2)', background: 'transparent', minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', cursor: isLoggedIn ? 'pointer' : 'default', transition: 'all 0.2s', padding: '1.6rem' }}
      onMouseEnter={e => { if (isLoggedIn) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.5)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.2)'; }}>
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
  game_types: string[]; max_players: number; note?: string; bring_game_ids?: string[];
  boardlife_game_id?: string; boardlife_game_name?: string; boardlife_game_thumb?: string;
  is_online: boolean;
}

function CreateModal({ onClose, onCreate, isPending, currentUserNickname, userGames }: {
  onClose: () => void; onCreate: (d: CreateData) => void;
  isPending: boolean; currentUserNickname: string; userGames: UserGame[];
}) {
  const today = new Date();
  const [title, setTitle]         = useState('');
  const [location, setLocation]   = useState('');
  const [date, setDate]           = useState(today.toISOString().slice(0, 10));
  const [time, setTime]           = useState('19:00');
  const [gameTypes, setGameTypes] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [note, setNote]           = useState('');
  const [customType, setCustomType] = useState('');
  const [bringGames, setBringGames] = useState<string[]>([]);
  const [boardlifeGame, setBoardlifeGame] = useState<PickedGame | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const toggleType = (t: string) => setGameTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const addCustom = () => { const v = customType.trim(); if (v && !gameTypes.includes(v)) setGameTypes(prev => [...prev, v]); setCustomType(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !date || !time) return;
    onCreate({ title: title || undefined, location, scheduled_at: new Date(`${date}T${time}:00`).toISOString(), game_types: gameTypes, max_players: maxPlayers, note: note || undefined, bring_game_ids: bringGames, boardlife_game_id: boardlifeGame?.boardlife_id, boardlife_game_name: boardlifeGame?.name, boardlife_game_thumb: boardlifeGame?.thumbnail_url ?? undefined, is_online: isOnline });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11,34,24,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 960, padding: '2rem 2.5rem' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.6rem' }}>
          <div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.28em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>OPEN ROOM</p>
            <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.2rem', color: 'var(--foreground)', lineHeight: 1.2 }}>방 개설하기</h2>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginTop: '0.3rem' }}>방장: {currentUserNickname}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 2열 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem 2.5rem' }}>

            {/* 왼쪽 열 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label="방 이름 (선택)">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${currentUserNickname}의 방`} style={inputStyle} />
              </Field>

              <Field label="모임 방식">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['오프라인', '온라인'] as const).map((lbl, i) => {
                    const online = i === 1; const active = isOnline === online;
                    return (
                      <button key={lbl} type="button" onClick={() => setIsOnline(online)}
                        style={{ flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.1em', padding: '0.55rem', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${active ? (online ? 'rgba(96,165,250,0.6)' : 'rgba(74,222,128,0.6)') : 'rgba(201,168,76,0.2)'}`, background: active ? (online ? 'rgba(96,165,250,0.1)' : 'rgba(74,222,128,0.1)') : 'transparent', color: active ? (online ? '#60a5fa' : '#4ade80') : 'var(--white-dim)' }}>
                        {online ? '🌐 ' : '📍 '}{lbl}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="모임 장소 *">
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="예: 강남 스타벅스 2층" required style={inputStyle} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <Field label="날짜 *"><input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} /></Field>
                <Field label="시간 *"><input type="time" value={time} onChange={e => setTime(e.target.value)} required style={inputStyle} /></Field>
              </div>

              <Field label="최대 인원">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                    <button key={n} type="button" onClick={() => setMaxPlayers(n)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', width: 34, height: 34, border: `1px solid ${maxPlayers === n ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: maxPlayers === n ? 'rgba(201,168,76,0.12)' : 'transparent', color: maxPlayers === n ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer' }}>{n}</button>
                  ))}
                </div>
              </Field>

              <Field label="메모 (선택)">
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="레벨 무관, 초보 환영 등" style={inputStyle} />
              </Field>
            </div>

            {/* 오른쪽 열 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label="이번 모임 게임 (선택)">
                <BoardlifeGamePicker value={boardlifeGame} onChange={setBoardlifeGame} placeholder="플레이할 보드게임 검색..." />
              </Field>

              <Field label="게임 종류">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.45rem' }}>
                  {GAME_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => toggleType(t)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.06em', padding: '0.25rem 0.65rem', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${gameTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: gameTypes.includes(t) ? `${TYPE_COLOR[t] ?? 'var(--gold)'}18` : 'transparent', color: gameTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'var(--white-dim)' }}>{t}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input value={customType} onChange={e => setCustomType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); }}} placeholder="직접 입력 후 Enter" style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={addCustom} style={{ ...inputStyle, width: 'auto', padding: '0 0.8rem', cursor: 'pointer', color: 'var(--gold)' }}>추가</button>
                </div>
                {gameTypes.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                    {gameTypes.map(t => (
                      <span key={t} onClick={() => toggleType(t)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.12rem 0.45rem', border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold)'}66`, color: TYPE_COLOR[t] ?? 'var(--gold)', cursor: 'pointer', background: `${TYPE_COLOR[t] ?? 'var(--gold)'}15` }}>{t} ✕</span>
                    ))}
                  </div>
                )}
              </Field>

              {/* 내 컬렉션에서 가져갈 게임 */}
              {userGames.length > 0 && (
                <Field label="가져갈 게임 (선택)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                    {userGames.map(g => (
                      <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.4rem 0.7rem', background: bringGames.includes(g.id) ? 'rgba(201,168,76,0.08)' : 'none', border: `1px solid ${bringGames.includes(g.id) ? 'rgba(201,168,76,0.3)' : 'transparent'}`, cursor: 'pointer' }}>
                        <input type="checkbox" checked={bringGames.includes(g.id)}
                          onChange={e => setBringGames(prev => e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id))}
                          style={{ accentColor: 'var(--gold)', flexShrink: 0 }} />
                        {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 24, height: 24, objectFit: 'cover', opacity: 0.8 }} />}
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)' }}>{g.name}</span>
                      </label>
                    ))}
                  </div>
                  {bringGames.length > 0 && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold)', marginTop: '0.35rem' }}>{bringGames.length}개 선택됨</p>}
                </Field>
              )}
            </div>
          </div>

          {/* 하단 버튼 */}
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.4rem', borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: '1.2rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', padding: '0.75rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer' }}>취소</button>
            <button type="submit" disabled={isPending || !location} style={{ flex: 3, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.18em', padding: '0.75rem', border: 'none', background: (!location || isPending) ? 'rgba(201,168,76,0.3)' : 'var(--gold)', color: '#0b2218', cursor: (!location || isPending) ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
              {isPending ? '개설 중...' : '방 개설'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── */
/* Edit Modal                          */
/* ─────────────────────────────────── */
function EditModal({ room, onClose, onSave, isPending }: {
  room: Room;
  onClose: () => void;
  onSave: (d: Omit<CreateData, 'bring_game_ids' | 'boardlife_game_id' | 'boardlife_game_name' | 'boardlife_game_thumb'>) => void;
  isPending: boolean;
}) {
  const scheduledDate = new Date(room.scheduled_at);
  const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const toLocalTime = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  const [title, setTitle]         = useState(room.title ?? '');
  const [location, setLocation]   = useState(room.location);
  const [date, setDate]           = useState(toLocalDate(scheduledDate));
  const [time, setTime]           = useState(toLocalTime(scheduledDate));
  const [gameTypes, setGameTypes] = useState<string[]>(room.game_types);
  const [maxPlayers, setMaxPlayers] = useState(room.max_players);
  const [note, setNote]           = useState(room.note ?? '');
  const [customType, setCustomType] = useState('');
  const [isOnline, setIsOnline]   = useState(room.is_online);

  const toggleType = (t: string) => setGameTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const addCustom = () => { const v = customType.trim(); if (v && !gameTypes.includes(v)) setGameTypes(prev => [...prev, v]); setCustomType(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !date || !time) return;
    onSave({ title: title || undefined, location, scheduled_at: new Date(`${date}T${time}:00`).toISOString(), game_types: gameTypes, max_players: maxPlayers, note: note || undefined, is_online: isOnline });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11,34,24,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.25em', color: 'var(--gold-dim)' }}>EDIT ROOM</p>
            <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', lineHeight: 1 }}>방 수정하기</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          <Field label="방 이름 (선택)">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="방 이름" style={inputStyle} />
          </Field>

          <Field label="모임 방식">
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['오프라인', '온라인'] as const).map((label, i) => {
                const online = i === 1;
                const active = isOnline === online;
                return (
                  <button key={label} type="button" onClick={() => setIsOnline(online)}
                    style={{ flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.12em', padding: '0.6rem', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${active ? (online ? 'rgba(96,165,250,0.6)' : 'rgba(74,222,128,0.6)') : 'rgba(201,168,76,0.2)'}`, background: active ? (online ? 'rgba(96,165,250,0.1)' : 'rgba(74,222,128,0.1)') : 'transparent', color: active ? (online ? '#60a5fa' : '#4ade80') : 'var(--white-dim)' }}>
                    {online ? '🌐 ' : '📍 '}{label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="게임 종류">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {GAME_TYPES.map(t => (
                <button key={t} type="button" onClick={() => toggleType(t)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em', padding: '0.3rem 0.7rem', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${gameTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: gameTypes.includes(t) ? `${TYPE_COLOR[t] ?? 'var(--gold)'}18` : 'transparent', color: gameTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'var(--white-dim)' }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input value={customType} onChange={e => setCustomType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); }}} placeholder="직접 입력 후 Enter" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={addCustom} style={{ ...inputStyle, width: 'auto', padding: '0 0.8rem', cursor: 'pointer', color: 'var(--gold)' }}>추가</button>
            </div>
            {gameTypes.length > 0 && (
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {gameTypes.map(t => (
                  <span key={t} onClick={() => toggleType(t)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.15rem 0.5rem', border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold)'}66`, color: TYPE_COLOR[t] ?? 'var(--gold)', cursor: 'pointer', background: `${TYPE_COLOR[t] ?? 'var(--gold)'}15` }}>{t} ✕</span>
                ))}
              </div>
            )}
          </Field>

          <Field label="모임 장소 *">
            <input value={location} onChange={e => setLocation(e.target.value)} required style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <Field label="날짜 *"><input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} /></Field>
            <Field label="시간 *"><input type="time" value={time} onChange={e => setTime(e.target.value)} required style={inputStyle} /></Field>
          </div>

          <Field label="최대 인원">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => setMaxPlayers(n)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', width: 36, height: 36, border: `1px solid ${maxPlayers === n ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: maxPlayers === n ? 'rgba(201,168,76,0.12)' : 'transparent', color: maxPlayers === n ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          </Field>

          <Field label="메모 (선택)">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="레벨 무관, 초보 환영 등" style={inputStyle} />
          </Field>

          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.4rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', padding: '0.8rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer' }}>취소</button>
            <button type="submit" disabled={isPending || !location} style={{ flex: 2, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', padding: '0.8rem', border: 'none', background: (!location || isPending) ? 'rgba(201,168,76,0.3)' : 'var(--gold)', color: '#0b2218', cursor: (!location || isPending) ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              {isPending ? '저장 중...' : '저장하기'}
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
      <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.57rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.5rem' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.9rem', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.25)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none',
};

function btnStyle(variant: 'gold' | 'ghost' | 'danger' | 'dim' | 'disabled'): React.CSSProperties {
  const base: React.CSSProperties = { display: 'block', width: '100%', padding: '0.55rem', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', cursor: variant === 'disabled' ? 'not-allowed' : 'pointer', border: 'none', textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s' };
  const variants = {
    gold:     { background: 'var(--gold)', color: '#0b2218', fontWeight: 600 },
    ghost:    { background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--white-dim)' },
    danger:   { background: 'rgba(255,100,100,0.12)', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888' },
    dim:      { background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--white-dim)', opacity: 0.6 },
    disabled: { background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)', color: 'var(--white-dim)', opacity: 0.4 },
  };
  return { ...base, ...variants[variant] } as React.CSSProperties;
}
