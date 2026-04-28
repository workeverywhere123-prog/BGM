'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BoardlifeGamePicker, { type PickedGame } from '@/components/BoardlifeGamePicker';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import LapisIcon from '@/components/LapisIcon';

interface Member { id: string; nickname: string; username: string; bring_game_ids: string[]; avatar_url?: string | null; }
interface Spectator { id: string; nickname: string; username: string; avatar_url?: string | null; }
interface RoomGame { boardlife_id: string; name: string; thumbnail_url: string | null; }
interface Room {
  id: string; title: string | null; location: string; scheduled_at: string;
  game_types: string[]; max_players: number; status: string;
  host_id: string; host: Member; members: Member[];
  spectators: Spectator[];
  note: string | null; youtube_url: string | null;
  games_json: RoomGame[];
  game_order_json: Member[] | null;
  team_result_json: Member[][] | null;
  is_online: boolean;
  boardlife_game_id: string | null;
  boardlife_game_name: string | null;
  boardlife_game_thumb: string | null;
  ready_player_ids: string[];
  started_at: string | null;
}

const TYPE_COLOR: Record<string, string> = {
  '마피아': '#e879f9', '유로': '#60a5fa', '전략': '#4ade80', '머더미스터리': '#a78bfa',
  '순위전': '#c9a84c', '협력': '#34d399', '파티': '#fb923c', '덱빌딩': '#f87171',
  '워게임': '#94a3b8', '기타': 'rgba(244,239,230,0.5)',
};

const GAME_TYPE_LABELS: Record<string, string> = {
  ranking: '순위전', mafia: '마피아', team: '팀전', coop: '협력', onevsmany: '1:다', deathmatch: '데스매치',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = days[d.getDay()];
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = hh < 12 ? '오전' : '오후';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${year}년 ${month}월 ${day}일 ${dow} ${ampm} ${h12}:${mm}`;
}

function statusLabel(s: string) {
  if (s === 'open') return { text: '모집중', color: 'var(--gold)' };
  if (s === 'full') return { text: '마감', color: '#4ade80' };
  if (s === 'playing') return { text: '게임중', color: '#fb923c' };
  if (s === 'voting') return { text: 'MVP 투표중', color: '#e879f9' };
  return { text: '종료', color: 'rgba(244,239,230,0.3)' };
}

export default function RoomDetail({ room, currentUserId, initialMvpVotes, initialUserVote, pendingInvite, initialPendingInvitations, leagueMatchId, leagueMatchPlayerIds }: {
  room: Room; currentUserId: string | null;
  initialMvpVotes: Record<string, number>;
  initialUserVote: string | null;
  pendingInvite: { id: string; inviter_id: string } | null;
  initialPendingInvitations: { invitee_id: string; invitee: { nickname: string; username: string } }[];
  leagueMatchId?: string | null;
  leagueMatchPlayerIds?: string[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(room.status);
  const [members, setMembers] = useState<Member[]>(room.members);
  const [spectators, setSpectators] = useState<Spectator[]>(room.spectators ?? []);
  const [selectedGames, setSelectedGames] = useState<RoomGame[]>(room.games_json ?? []);
  const [gameOrder, setGameOrder] = useState<Member[]>(room.game_order_json ?? []);
  const [teamResult, setTeamResult] = useState<Member[][]>(room.team_result_json ?? []);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [pickerGame, setPickerGame] = useState<PickedGame | null>(null);
  const [savingGames, setSavingGames] = useState(false);
  const [mvpVotes, setMvpVotes] = useState<Record<string, number>>(initialMvpVotes);
  const [userVote, setUserVote] = useState<string | null>(initialUserVote);
  const [myInvite, setMyInvite] = useState(pendingInvite);
  const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations);
  const [tab, setTab] = useState<'info' | 'order' | 'team' | 'manage' | 'result' | 'vote' | 'youtube' | 'bgm'>(
    room.status === 'voting' ? 'vote' : 'info'
  );
  const [starting, setStarting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(room.is_online);
  const [readyIds, setReadyIds] = useState<string[]>(room.ready_player_ids ?? []);
  const [startedAt, setStartedAt] = useState<string | null>(room.started_at ?? null);
  const [elapsed, setElapsed] = useState(0);
  const [roomInfo, setRoomInfo] = useState({
    title: room.title,
    location: room.location,
    scheduled_at: room.scheduled_at,
    game_types: room.game_types,
    max_players: room.max_players,
    note: room.note,
    boardlife_game_id: room.boardlife_game_id,
    boardlife_game_name: room.boardlife_game_name,
    boardlife_game_thumb: room.boardlife_game_thumb,
  });

  const isMember = members.some(m => m.id === currentUserId);
  const isSpectator = spectators.some(s => s.id === currentUserId);
  const isHost = room.host_id === currentUserId;
  const st = statusLabel(status);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase
      .channel(`room-sync-${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (payload) => {
        const r = payload.new as { game_order_json?: Member[] | null; team_result_json?: Member[][] | null; ready_player_ids?: string[]; started_at?: string | null };
        if (r.game_order_json !== undefined) setGameOrder(r.game_order_json ?? []);
        if (r.team_result_json !== undefined) setTeamResult(r.team_result_json ?? []);
        if (r.ready_player_ids !== undefined) setReadyIds(r.ready_player_ids ?? []);
        if (r.started_at !== undefined) setStartedAt(r.started_at ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room.id]);

  // Running timer when playing
  useEffect(() => {
    if (status !== 'playing' || !startedAt) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [status, startedAt]);

  const tabs = [
    { key: 'info' as const, label: '방 정보' },
    { key: 'order' as const, label: '게임 순서' },
    { key: 'team' as const, label: '팀 빌더' },
    ...(isHost ? [{ key: 'manage' as const, label: '방장 관리' }] : []),
    ...(isHost && status === 'playing' ? [{ key: 'result' as const, label: '결과 등록' }] : []),
    ...(status === 'voting' && isMember ? [{ key: 'vote' as const, label: 'MVP 투표' }] : []),
    { key: 'youtube' as const, label: '룰 영상' },
    { key: 'bgm' as const, label: '배경음악' },
  ];

  async function handleUpdateBringGames(ids: string[]) {
    setMembers(prev => prev.map(m => m.id === currentUserId ? { ...m, bring_game_ids: ids } : m));
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_bring_games', bring_game_ids: ids }),
    });
  }

  async function addGame() {
    if (!pickerGame) return;
    const already = selectedGames.some(g => g.boardlife_id === pickerGame.boardlife_id);
    if (already) { setPickerGame(null); return; }
    const next = [...selectedGames, { boardlife_id: pickerGame.boardlife_id, name: pickerGame.name, thumbnail_url: pickerGame.thumbnail_url }];
    setSavingGames(true);
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_games', games: next }),
    });
    setSelectedGames(next);
    setPickerGame(null);
    setShowGamePicker(false);
    setSavingGames(false);
  }

  async function removeGame(boardlife_id: string) {
    const next = selectedGames.filter(g => g.boardlife_id !== boardlife_id);
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_games', games: next }),
    });
    setSelectedGames(next);
  }

  async function handleToggleOnline(val: boolean) {
    setIsOnline(val);
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_online', is_online: val }),
    });
  }

  async function handleToggleReady() {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_ready' }),
    });
    if (res.ok) {
      const d = await res.json();
      setReadyIds(d.ready_player_ids ?? []);
    }
  }

  const nonHostMembers = members.filter(m => m.id !== room.host_id);
  const allReady = nonHostMembers.length === 0 || nonHostMembers.every(m => readyIds.includes(m.id));

  async function handleStart() {
    if (!allReady) { alert('모든 참가자가 준비를 완료해야 시작할 수 있습니다.'); return; }
    if (!confirm('모임을 시작하면 더 이상 참가자가 참여할 수 없습니다. 시작하시겠습니까?')) return;
    setStarting(true);
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    if (res.ok) {
      const d = await res.json();
      setStatus('playing');
      setStartedAt(d.started_at ?? null);
      setTab('order');
    }
    setStarting(false);
  }

  async function handleJoin() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });
      const d = await res.json();
      if (!res.ok) { alert('오류: ' + (d.error ?? res.status)); setActionLoading(false); return; }
      if (d.player) {
        setMembers(prev => [...prev.filter(m => m.id !== d.player.id), { ...d.player, bring_game_ids: [] }]);
        setSpectators(prev => prev.filter(s => s.id !== d.player.id));
        if (d.status) setStatus(d.status);
      }
    } catch (e) { alert('네트워크 오류: ' + e); }
    setActionLoading(false);
  }

  async function handleSpectate() {
    setActionLoading(true);
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'spectate' }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.player) setSpectators(prev => [...prev, d.player]);
    }
    setActionLoading(false);
  }

  async function handleLeaveRoom() {

    setActionLoading(true);
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: isSpectator ? 'leave_spectate' : 'leave' }),
    });
    router.push('/rooms');
  }

  async function handleToSpectate() {
    setActionLoading(true);
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'to_spectate' }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.player) {
        setMembers(prev => prev.filter(m => m.id !== currentUserId));
        setSpectators(prev => [...prev, d.player]);
        if (status === 'full') setStatus('open');
      }
    }
    setActionLoading(false);
  }

  async function handleLeaveSpectate() {
    setActionLoading(true);
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave_spectate' }),
    });
    setSpectators(prev => prev.filter(s => s.id !== currentUserId));
    setActionLoading(false);
  }

  async function handleVote(nomineeId: string) {
    const prev = userVote;
    setUserVote(nomineeId);
    setMvpVotes(v => {
      const next = { ...v };
      if (prev) next[prev] = Math.max(0, (next[prev] ?? 1) - 1);
      next[nomineeId] = (next[nomineeId] ?? 0) + 1;
      return next;
    });
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit_mvp_vote', nominee_id: nomineeId }),
    });
  }

  async function handleReopen() {
    if (!confirm('게임중 상태를 모집중으로 되돌리시겠습니까?')) return;
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen' }),
    });
    if (res.ok) { const d = await res.json(); setStatus(d.status); }
  }

  async function handleKick(playerId: string, nickname: string) {
    if (!confirm(`${nickname}님을 방에서 내보내시겠습니까?`)) return;
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kick', player_id: playerId }),
    });
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== playerId));
      if (status === 'full') setStatus('open');
    }
  }

  async function handleInvite(playerId: string, invitee: { nickname: string; username: string }) {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invite', player_id: playerId }),
    });
    if (res.ok) {
      setPendingInvitations(prev => [...prev.filter(i => i.invitee_id !== playerId), { invitee_id: playerId, invitee }]);
    }
    return res.ok;
  }

  async function handleAcceptInvite() {
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept_invite' }),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.player) {
        setMembers(prev => [...prev, { ...d.player, bring_game_ids: [] }]);
        if (d.status) setStatus(d.status);
      }
      setMyInvite(null);
    }
  }

  async function handleDeclineInvite() {
    await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline_invite' }),
    });
    setMyInvite(null);
  }

  async function handleFinalizeMvp() {
    if (!confirm('투표를 종료하고 방을 닫으시겠습니까?')) return;
    const res = await fetch(`/api/rooms/${room.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'finalize_mvp' }),
    });
    if (res.ok) router.push('/rooms');
  }

  const btnStyle = (variant: 'gold' | 'ghost' | 'cyan' | 'disabled') => ({
    padding: '0.55rem 1.2rem',
    border: variant === 'gold' ? 'none' : `1px solid ${variant === 'cyan' ? 'rgba(96,165,250,0.5)' : variant === 'ghost' ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.15)'}`,
    background: variant === 'gold' ? 'var(--gold)' : variant === 'cyan' ? 'rgba(96,165,250,0.1)' : 'transparent',
    color: variant === 'gold' ? '#0b2218' : variant === 'cyan' ? '#60a5fa' : variant === 'disabled' ? 'rgba(244,239,230,0.25)' : 'var(--gold)',
    fontFamily: "'Cinzel', serif" as const,
    fontSize: '0.62rem',
    letterSpacing: '0.12em',
    fontWeight: variant === 'gold' ? 700 : 400,
    cursor: (variant === 'disabled' || actionLoading) ? 'not-allowed' as const : 'pointer' as const,
    opacity: actionLoading ? 0.6 : 1,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  });

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 2rem 6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/rooms" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textDecoration: 'none' }}>
          ← 보드게임방 목록
        </Link>
        {['open', 'full'].includes(status) && (
          <button
            onClick={() => {
              const title = room.title || `${room.host.nickname}의 방`;
              const days = ['일', '월', '화', '수', '목', '금', '토'];
              const d = new Date(room.scheduled_at);
              const dateStr = `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]}) ${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours()%12||12}:${String(d.getMinutes()).padStart(2,'0')}`;
              const url = window.location.href;
              const modeTag = isOnline ? '🌐 온라인' : '📍 오프라인';
              const gameTag = room.game_types.length ? room.game_types.join(' · ') : '보드게임';
              const text =
                `🎲 BGM 보드게임 모임 모집!\n\n` +
                `📌 ${title}\n` +
                `🗂 ${gameTag}  ${modeTag}\n` +
                `📅 ${dateStr}\n` +
                `📍 ${room.location}\n` +
                `👥 현재 인원: ${members.length}/${room.max_players}명\n` +
                (room.note ? `💬 ${room.note}\n` : '') +
                `\n▶ 참가하기: ${url}\n\n` +
                `#BGM #보드게임 #멜버른한인`;
              if (navigator.share) {
                navigator.share({ title: `[BGM] ${title}`, text, url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text).then(() => {
                  alert('모집 공고가 클립보드에 복사됐습니다!\n카카오톡 단톡방에 붙여넣기 하세요. 📋');
                }).catch(() => { prompt('복사 후 카카오톡에 붙여넣기 하세요:', text); });
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.9rem', background: '#FEE500', border: 'none', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: '#3C1E1E', fontWeight: 700, flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="12" cy="11.5" rx="10" ry="8.5" fill="#3C1E1E"/>
              <path d="M9 11.5q.6-2 3-2 2.4 0 3 2M10 13l1 2 1-1.5 1 1.5 1-2" stroke="#FEE500" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            카카오 공유
          </button>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
        {/* League match notice */}
        {leagueMatchId && (
          <div style={{ marginBottom: '1rem', padding: '0.7rem 1rem', border: '1px solid rgba(88,101,242,0.4)', background: 'rgba(88,101,242,0.07)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '1rem' }}>⚔️</span>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', color: '#818cf8', marginBottom: '0.15rem' }}>리그 경기 전용 방</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', opacity: 0.8 }}>
                {currentUserId && leagueMatchPlayerIds?.includes(currentUserId)
                  ? '경기 참가자입니다. 방에 입장할 수 있습니다.'
                  : '이 방은 경기 선수만 참가할 수 있습니다. 관전으로 참여해주세요.'}
              </p>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.8rem' }}>
          {room.game_types.map(t => (
            <span key={t} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', padding: '0.2rem 0.6rem', border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold-dim)'}55`, color: TYPE_COLOR[t] ?? 'var(--gold-dim)', background: `${TYPE_COLOR[t] ?? 'var(--gold)'}10` }}>{t}</span>
          ))}
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', padding: '0.2rem 0.6rem', border: `1px solid ${st.color}44`, color: st.color }}>
            {st.text}
          </span>
        </div>
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: 'var(--foreground)', lineHeight: 1.1 }}>
          {room.title || `${room.host.nickname}의 방`}
        </h1>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', marginTop: '0.5rem' }}>
          {fmtDate(room.scheduled_at)}
        </p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', marginTop: '0.3rem' }}>📍 {room.location}</p>
        {room.note && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.6, marginTop: '0.4rem' }}>{room.note}</p>}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {/* 선택된 게임 목록 */}
        {selectedGames.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)' }}>오늘의 게임</span>
            {selectedGames.map(g => (
              <div key={g.boardlife_id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)' }}>
                <a href={`https://boardlife.co.kr/game/${g.boardlife_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}>
                  {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.85 }} />}
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--foreground)', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(201,168,76,0.4)' }}>{g.name}</span>
                </a>
                {isHost && (
                  <button onClick={() => removeGame(g.boardlife_id)} style={{ background: 'none', border: 'none', color: 'rgba(244,239,230,0.25)', cursor: 'pointer', fontSize: '0.7rem', padding: '0 0.1rem', lineHeight: 1 }}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 방장 게임 추가 */}
        {isHost && ['open', 'full', 'playing'].includes(status) && (
          <div style={{ marginTop: '0.8rem' }}>
            {showGamePicker ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <BoardlifeGamePicker value={pickerGame} onChange={setPickerGame} placeholder="추가할 게임 검색..." />
                </div>
                <button onClick={addGame} disabled={!pickerGame || savingGames} style={{ padding: '0.5rem 1rem', background: pickerGame ? 'var(--gold)' : 'rgba(201,168,76,0.2)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', cursor: pickerGame ? 'pointer' : 'not-allowed', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {savingGames ? '...' : '추가'}
                </button>
                <button onClick={() => { setShowGamePicker(false); setPickerGame(null); }} style={{ padding: '0.5rem 0.7rem', background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', cursor: 'pointer' }}>취소</button>
              </div>
            ) : (
              <button onClick={() => setShowGamePicker(true)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', padding: '0.35rem 0.9rem', border: '1px dashed rgba(201,168,76,0.25)', background: 'transparent', color: 'var(--gold-dim)', cursor: 'pointer' }}>
                + 게임 추가
              </button>
            )}
          </div>
        )}

        {/* 준비 버튼 (비방장 참가자) */}
          {currentUserId && isMember && !isHost && ['open', 'full'].includes(status) && (
            <button onClick={handleToggleReady} style={{
              marginTop: '0.8rem',
              padding: '0.6rem 1.6rem', border: 'none',
              background: readyIds.includes(currentUserId) ? '#4ade80' : 'rgba(74,222,128,0.15)',
              color: readyIds.includes(currentUserId) ? '#0b2218' : '#4ade80',
              fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
              fontWeight: 700, cursor: 'pointer',
            }}>
              {readyIds.includes(currentUserId) ? '✓ 준비완료 (취소)' : '준비'}
            </button>
          )}

          {/* 방장 시작 버튼 */}
          {isHost && ['open', 'full'].includes(status) && (
            <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {nonHostMembers.length > 0 && (
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: allReady ? '#4ade80' : 'var(--white-dim)', letterSpacing: '0.1em' }}>
                  {allReady ? '✓ 모든 참가자 준비완료' : `준비 대기 중 (${readyIds.filter(id => nonHostMembers.some(m => m.id === id)).length}/${nonHostMembers.length}명 준비)`}
                </p>
              )}
              <button onClick={handleStart} disabled={starting || !allReady} style={{
                padding: '0.6rem 1.8rem', background: allReady ? '#fb923c' : 'rgba(251,146,60,0.25)', border: 'none',
                color: allReady ? '#0b2218' : 'rgba(251,146,60,0.5)', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
                fontWeight: 700, cursor: starting || !allReady ? 'not-allowed' : 'pointer', opacity: starting ? 0.7 : 1,
              }}>
                {starting ? '시작 중...' : '▶ 모임 시작'}
              </button>
            </div>
          )}

          {/* 게임 중 타이머 */}
          {status === 'playing' && startedAt && (
            <div style={{ marginTop: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', border: '1px solid rgba(251,146,60,0.3)', background: 'rgba(251,146,60,0.06)' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', color: '#fb923c' }}>⏱ 게임 진행</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: '#fb923c', fontVariantNumeric: 'tabular-nums' }}>
                {String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* 관전자: 참가자로 전환 or 방 나가기 */}
          {currentUserId && isSpectator && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#60a5fa', letterSpacing: '0.1em' }}>👁 관전 중</span>
              {['open', 'full'].includes(status) && (
                <button onClick={handleJoin} disabled={actionLoading} style={{ ...btnStyle('gold'), padding: '0.55rem 1.4rem' }}>
                  참가자로 전환
                </button>
              )}
              <button onClick={handleLeaveRoom} disabled={actionLoading} style={{ ...btnStyle('ghost'), padding: '0.55rem 1.2rem' }}>
                방 나가기
              </button>
            </div>
          )}

          {/* 참여자(비방장): 관전자로 전환 + 방 나가기 */}
          {currentUserId && isMember && !isHost && (
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              {['open', 'full'].includes(status) && (
                <button onClick={handleToSpectate} disabled={actionLoading} style={{ ...btnStyle('cyan'), padding: '0.55rem 1.2rem' }}>
                  👁 관전자로 전환
                </button>
              )}
              <button onClick={handleLeaveRoom} disabled={actionLoading} style={{ ...btnStyle('ghost'), padding: '0.55rem 1.2rem' }}>
                방 나가기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 초대 수락 배너 */}
      {myInvite && !isMember && (
        <div style={{ margin: '1rem 0', padding: '1rem 1.4rem', border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.07)', display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold)', marginBottom: '0.2rem' }}>초대받았습니다</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)' }}>방장이 이 방에 초대했습니다. 참여하시겠습니까?</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleAcceptInvite} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em', padding: '0.5rem 1.2rem', background: 'var(--gold)', border: 'none', color: '#0b2218', fontWeight: 700, cursor: 'pointer' }}>
              수락
            </button>
            <button onClick={handleDeclineInvite} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em', padding: '0.5rem 0.9rem', background: 'transparent', border: '1px solid rgba(244,239,230,0.15)', color: 'var(--white-dim)', cursor: 'pointer' }}>
              거절
            </button>
          </div>
        </div>
      )}

      <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, var(--gold-dim), transparent)', marginBottom: '2rem' }} />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: '2rem', borderBottom: '1px solid rgba(201,168,76,0.12)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em',
            padding: '0.6rem 1.2rem', cursor: 'pointer', border: 'none',
            background: 'transparent',
            color: tab === t.key ? (t.key === 'result' || t.key === 'vote' ? '#fb923c' : t.key === 'bgm' ? '#60a5fa' : t.key === 'manage' ? '#4ade80' : 'var(--gold)') : 'var(--white-dim)',
            borderBottom: `2px solid ${tab === t.key ? (t.key === 'result' || t.key === 'vote' ? '#fb923c' : t.key === 'bgm' ? '#60a5fa' : t.key === 'manage' ? '#4ade80' : 'var(--gold)') : 'transparent'}`,
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'info' && <InfoTab room={{ ...room, members }} spectators={spectators} currentUserId={currentUserId} isHost={isHost} isMember={isMember} status={status} selectedGames={selectedGames} readyIds={readyIds} onBringGamesChange={handleUpdateBringGames} />}
      {tab === 'order' && <GameOrderTab members={members} isHost={isHost} roomId={room.id} order={gameOrder} onShuffle={setGameOrder} />}
      {tab === 'team' && <TeamBuilder members={members} isHost={isHost} roomId={room.id} teams={teamResult} onBuild={setTeamResult} />}
      {tab === 'manage' && isHost && (
        <HostManageTab
          members={members} spectators={spectators} status={status}
          roomId={room.id} hostId={room.host_id}
          pendingInvitations={pendingInvitations}
          isOnline={isOnline}
          roomInfo={roomInfo}
          onKick={handleKick} onInvite={handleInvite}
          onReopen={handleReopen}
          onStart={handleStart}
          onToggleOnline={handleToggleOnline}
          onGoResult={() => setTab('result')}
          onRoomInfoSaved={(updated) => {
            setRoomInfo(updated);
            setIsOnline(updated.is_online ?? isOnline);
          }}
        />
      )}
      {tab === 'result' && isHost && status === 'playing' && (
        <ResultRecorder members={members} roomId={room.id} onDone={() => { setStatus('voting'); setTab('vote'); }} />
      )}
      {tab === 'vote' && status === 'voting' && isMember && (
        <MvpVoting
          members={members} roomId={room.id} isHost={isHost}
          votes={mvpVotes} userVote={userVote}
          onVote={handleVote} onFinalize={handleFinalizeMvp}
        />
      )}
      {tab === 'youtube' && <YoutubeSearch gameTypes={room.game_types} selectedGames={selectedGames} initialUrl={room.youtube_url} roomId={room.id} isHost={isHost} />}
      {tab === 'bgm' && <BgmSearch gameTypes={room.game_types} selectedGames={selectedGames} />}
    </div>
  );
}

/* ─────────────────────────────── */
/* Info Tab                        */
/* ─────────────────────────────── */
function InfoTab({ room, spectators, currentUserId, isHost, isMember, status, selectedGames, readyIds, onBringGamesChange }: {
  room: Room; spectators: Spectator[]; currentUserId: string | null; isHost: boolean; isMember: boolean; status: string;
  selectedGames: RoomGame[]; readyIds: string[]; onBringGamesChange: (ids: string[]) => void;
}) {
  const myMember = room.members.find(m => m.id === currentUserId);
  const myBringIds: string[] = myMember?.bring_game_ids ?? [];

  const toggleBring = (boardlife_id: string) => {
    const next = myBringIds.includes(boardlife_id)
      ? myBringIds.filter(x => x !== boardlife_id)
      : [...myBringIds, boardlife_id];
    onBringGamesChange(next);
  };

  return (
    <div>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>
        참가자 {room.members.length} / {room.max_players}명
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {room.members.map(m => (
          <Link href={`/profile/${m.username}`} key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
            background: 'rgba(30,74,52,0.15)', textDecoration: 'none',
            borderLeft: `2px solid ${m.id === room.host_id ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}`,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${m.id === room.host_id ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`, background: 'rgba(30,74,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: 'var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
              {m.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={m.avatar_url} alt={m.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : m.nickname[0]}
            </div>
            <div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>
                {m.nickname}
                {m.id === room.host_id && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold)', marginLeft: '0.5rem', border: '1px solid var(--gold)', padding: '0.1rem 0.35rem' }}>방장</span>}
              </p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5 }}>@{m.username}</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
              {m.id === currentUserId && (
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: isHost ? 'var(--gold-dim)' : 'rgba(244,239,230,0.4)' }}>
                  {isHost ? '나 (방장)' : '나'}
                </span>
              )}
              {['open', 'full'].includes(status) && m.id !== room.host_id && (
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.1rem 0.45rem', border: `1px solid ${readyIds.includes(m.id) ? '#4ade80' : 'rgba(244,239,230,0.15)'}`, color: readyIds.includes(m.id) ? '#4ade80' : 'rgba(244,239,230,0.25)' }}>
                  {readyIds.includes(m.id) ? '✓ 준비' : '대기중'}
                </span>
              )}
              {(m.bring_game_ids ?? []).length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(m.bring_game_ids ?? []).map(bid => {
                    const g = selectedGames.find(x => x.boardlife_id === bid);
                    if (!g) return null;
                    return (
                      <span key={bid} title={g.name} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.1rem 0.4rem', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', fontSize: '0.52rem', fontFamily: "'Cinzel', serif", color: 'var(--gold-dim)' }}>
                        {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 12, height: 12, objectFit: 'contain', opacity: 0.8 }} />}
                        {g.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Spectators section */}
      {spectators.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: '#60a5fa', opacity: 0.7, marginBottom: '0.6rem' }}>
            관전자 {spectators.length}명
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {spectators.map(s => (
              <Link href={`/profile/${s.username}`} key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 1rem',
                background: 'rgba(96,165,250,0.04)', textDecoration: 'none',
                borderLeft: '2px solid rgba(96,165,250,0.2)',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: '#60a5fa', flexShrink: 0, overflow: 'hidden' }}>
                  {s.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={s.avatar_url} alt={s.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : s.nickname[0]}
                </div>
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'rgba(244,239,230,0.6)' }}>
                    {s.nickname}
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#60a5fa', marginLeft: '0.5rem', border: '1px solid rgba(96,165,250,0.3)', padding: '0.05rem 0.3rem' }}>관전</span>
                  </p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.35 }}>@{s.username}</p>
                </div>
                {s.id === currentUserId && (
                  <span style={{ marginLeft: 'auto', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(96,165,250,0.5)' }}>나</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 게임 지참 현황 */}
      {selectedGames.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
            게임 지참 현황
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedGames.map(g => {
              const bringers = room.members.filter(m => (m.bring_game_ids ?? []).includes(g.boardlife_id));
              return (
                <div key={g.boardlife_id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 1rem', background: 'rgba(30,74,52,0.1)', border: '1px solid rgba(201,168,76,0.1)' }}>
                  {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.85, flexShrink: 0 }} />}
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)', flex: 1 }}>{g.name}</span>
                  {bringers.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {bringers.map(m => (
                        <span key={m.id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.15rem 0.45rem', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)' }}>
                          {m.nickname}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(244,239,230,0.25)' }}>미정</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 내가 가져올 게임 체크 */}
          {isMember && (
            <div style={{ marginTop: '1.2rem', padding: '1rem 1.2rem', border: '1px dashed rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>내가 가져올 게임</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {selectedGames.map(g => {
                  const checked = myBringIds.includes(g.boardlife_id);
                  return (
                    <label key={g.boardlife_id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBring(g.boardlife_id)}
                        style={{ accentColor: 'var(--gold)', width: 14, height: 14, cursor: 'pointer' }}
                      />
                      {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.8 }} />}
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: checked ? 'var(--gold)' : 'var(--foreground)' }}>{g.name}</span>
                      {checked && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#4ade80' }}>✓ 가져옴</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── */
/* Game Order Tab                  */
/* ─────────────────────────────── */
function GameOrderTab({ members, isHost, roomId, order, onShuffle }: {
  members: Member[]; isHost: boolean; roomId: string; order: Member[]; onShuffle: (o: Member[]) => void;
}) {
  const [rolling, setRolling] = useState(false);

  const shuffle = async () => {
    setRolling(true);
    const newOrder = [...members].sort(() => Math.random() - 0.5);
    setTimeout(async () => {
      onShuffle(newOrder);
      setRolling(false);
      await fetch(`/api/rooms/${roomId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_game_order', order: newOrder }),
      });
    }, 600);
  };

  const reset = async () => {
    onShuffle([]);
    await fetch(`/api/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_game_order', order: null }),
    });
  };

  return (
    <div>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1.5rem' }}>
        GAME ORDER — 게임 순서 무작위 배정
      </p>

      {isHost && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={shuffle} disabled={rolling || members.length === 0} style={{
            padding: '0.6rem 2rem', background: rolling ? 'rgba(201,168,76,0.3)' : 'var(--gold)',
            border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.68rem',
            letterSpacing: '0.15em', fontWeight: 600, cursor: rolling ? 'not-allowed' : 'pointer',
          }}>
            {rolling ? '추첨 중...' : order.length ? '다시 추첨' : '순서 추첨'}
          </button>
          {order.length > 0 && (
            <button onClick={reset} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', cursor: 'pointer' }}>
              초기화
            </button>
          )}
        </div>
      )}

      {order.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {order.map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '0.9rem 1.2rem',
              background: i === 0 ? 'rgba(201,168,76,0.12)' : 'rgba(30,74,52,0.15)',
              borderLeft: `3px solid ${i === 0 ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
              transition: 'all 0.3s',
            }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: i === 0 ? '1.4rem' : '1rem', color: i === 0 ? 'var(--gold)' : 'var(--white-dim)', minWidth: 36, textAlign: 'center', fontWeight: i === 0 ? 700 : 400 }}>
                {i + 1}
              </span>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${i === 0 ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`, background: 'rgba(30,74,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: 'var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
                {m.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.avatar_url} alt={m.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : m.nickname[0]}
              </div>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: i === 0 ? 'var(--gold)' : 'var(--foreground)' }}>
                  {m.nickname}
                  {i === 0 && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: '#fb923c', marginLeft: '0.6rem' }}>선 플레이어</span>}
                </p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.4 }}>@{m.username}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', color: 'var(--white-dim)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontStyle: 'italic', opacity: 0.5 }}>
          {isHost ? '버튼을 눌러 게임 순서를 무작위로 배정하세요' : '방장이 순서를 추첨하면 여기에 표시됩니다'}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── */
/* Result Recorder                 */
/* ─────────────────────────────── */
type GameTypeKey = 'ranking' | 'mafia' | 'team' | 'coop' | 'onevsmany' | 'deathmatch';

interface ParticipantInput {
  player_id: string;
  nickname: string;
  rank: number;
  team: string;
  role: string;
  is_winner: boolean;
  is_mvp: boolean;
  score: string;
}

function calcLapis(rank: number, total: number): number {
  if (total % 2 === 1) return Math.ceil(total / 2) - rank;
  const half = total / 2;
  return rank <= half ? half - rank + 1 : half - rank;
}

function ResultRecorder({ members, roomId, onDone }: { members: Member[]; roomId: string; onDone: () => void }) {
  const [gameType, setGameType] = useState<GameTypeKey>('ranking');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 순위전: members 순서 = 순위 (위에서부터 1등)
  const [rankOrder, setRankOrder] = useState<Member[]>([...members]);

  const initialOther = useMemo(() => members.map((m, i) => ({
    player_id: m.id, nickname: m.nickname,
    rank: i + 1, team: i % 2 === 0 ? 'A' : 'B',
    role: '', score: '', is_winner: false, is_mvp: false,
  })), [members]);
  const [parts, setParts] = useState<ParticipantInput[]>(initialOther);

  const update = (idx: number, patch: Partial<ParticipantInput>) =>
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));

  const handleGameTypeChange = (gt: GameTypeKey) => {
    setGameType(gt);
    setRankOrder([...members]);
    setParts(initialOther.map((p, i) => ({ ...p,
      rank: i + 1, team: i % 2 === 0 ? 'A' : 'B',
      role: gt === 'mafia' ? '시민' : gt === 'onevsmany' ? '다수' : '',
      is_winner: false, is_mvp: false, score: '',
    })));
  };

  // 순위 위/아래 이동
  const moveUp   = (i: number) => { if (i === 0) return; const a = [...rankOrder]; [a[i-1], a[i]] = [a[i], a[i-1]]; setRankOrder(a); };
  const moveDown = (i: number) => { if (i === rankOrder.length - 1) return; const a = [...rankOrder]; [a[i], a[i+1]] = [a[i+1], a[i]]; setRankOrder(a); };

  const submit = async () => {
    if (!confirm('결과를 등록하면 방이 자동으로 닫힙니다. 계속하시겠습니까?')) return;
    setSubmitting(true); setError('');

    let participants;
    if (gameType === 'ranking') {
      participants = rankOrder.map((m, i) => ({ player_id: m.id, rank: i + 1 }));
    } else {
      participants = parts.map(p => ({
        player_id: p.player_id,
        team: gameType === 'team' ? p.team : undefined,
        role: ['mafia', 'onevsmany'].includes(gameType) ? p.role : undefined,
        is_winner: p.is_winner,
        score: p.score !== '' ? parseInt(p.score) : undefined,
      }));
    }

    const res = await fetch(`/api/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_results', game_type: gameType, participants }),
    });
    if (res.ok) { onDone(); }
    else { const d = await res.json(); setError(d.error ?? '오류가 발생했습니다'); }
    setSubmitting(false);
  };

  const s = { fontFamily: "'Cinzel', serif" as const };
  const total = members.length;

  return (
    <div>
      <p style={{ ...s, fontSize: '0.6rem', letterSpacing: '0.2em', color: '#fb923c', marginBottom: '1.5rem' }}>
        RESULT — 게임 결과 등록
      </p>

      {/* 게임 유형 선택 */}
      <div style={{ marginBottom: '1.8rem' }}>
        <p style={{ ...s, fontSize: '0.55rem', color: 'var(--white-dim)', marginBottom: '0.6rem', letterSpacing: '0.15em' }}>게임 유형</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(Object.keys(GAME_TYPE_LABELS) as GameTypeKey[]).map(gt => (
            <button key={gt} onClick={() => handleGameTypeChange(gt)} style={{
              padding: '0.4rem 1rem', ...s, fontSize: '0.62rem',
              border: `1px solid ${gameType === gt ? '#fb923c' : 'rgba(201,168,76,0.2)'}`,
              background: gameType === gt ? 'rgba(251,146,60,0.12)' : 'transparent',
              color: gameType === gt ? '#fb923c' : 'var(--white-dim)', cursor: 'pointer',
            }}>{GAME_TYPE_LABELS[gt]}</button>
          ))}
        </div>
      </div>

      {/* ── 순위전 UI ── */}
      {gameType === 'ranking' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
            순서를 드래그하거나 ↑↓ 버튼으로 조정하세요 — 위에서부터 1등
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {rankOrder.map((m, i) => {
              const lapis = calcLapis(i + 1, total);
              const lapisColor = lapis > 0 ? '#4ade80' : lapis < 0 ? '#f87171' : 'var(--white-dim)';
              return (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto auto', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: i === 0 ? 'rgba(201,168,76,0.1)' : 'rgba(30,74,52,0.2)', border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.08)'}`, transition: 'all 0.15s' }}>
                  {/* 등수 뱃지 */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ ...s, fontSize: '0.62rem', color: i === 0 ? 'var(--gold)' : 'var(--white-dim)', opacity: i === 0 ? 1 : 0.6 }}>{i + 1}등</span>
                  </div>
                  {/* 닉네임 */}
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{m.nickname}</span>
                  {/* LAPIS 예상 */}
                  <span style={{ ...s, fontSize: '0.65rem', color: lapisColor, minWidth: 80, textAlign: 'right', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                    {lapis > 0 ? '+' : ''}{lapis} <LapisIcon size={11} /> LAPIS
                  </span>
                  {/* 이동 버튼 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => moveUp(i)} disabled={i === 0}
                      style={{ ...s, width: 28, height: 22, fontSize: '0.6rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: i === 0 ? 'rgba(255,255,255,0.1)' : 'var(--gold)', cursor: i === 0 ? 'default' : 'pointer' }}>↑</button>
                    <button onClick={() => moveDown(i)} disabled={i === rankOrder.length - 1}
                      style={{ ...s, width: 28, height: 22, fontSize: '0.6rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: i === rankOrder.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--gold)', cursor: i === rankOrder.length - 1 ? 'default' : 'pointer' }}>↓</button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* LAPIS 합계 확인 */}
          <div style={{ marginTop: '0.8rem', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(201,168,76,0.1)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ ...s, fontSize: '0.52rem', color: 'var(--gold-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><LapisIcon size={10} /> LAPIS 분배 미리보기</span>
            {rankOrder.map((m, i) => {
              const lapis = calcLapis(i + 1, total);
              return (
                <span key={m.id} style={{ ...s, fontSize: '0.52rem', color: lapis > 0 ? '#4ade80' : lapis < 0 ? '#f87171' : 'var(--white-dim)' }}>
                  {m.nickname}: {lapis > 0 ? '+' : ''}{lapis}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 기타 게임 UI ── */}
      {gameType !== 'ranking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem', padding: '0.4rem 1rem',
            gridTemplateColumns: gameType === 'mafia' ? '1fr 120px 100px 80px' : gameType === 'team' ? '1fr 80px 100px 80px' : gameType === 'onevsmany' ? '1fr 120px 100px 80px' : '1fr 100px 80px',
            fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5, letterSpacing: '0.1em' }}>
            <span>플레이어</span>
            {gameType === 'mafia' && <span style={{ textAlign: 'center' }}>역할</span>}
            {gameType === 'team' && <span style={{ textAlign: 'center' }}>팀</span>}
            {gameType === 'onevsmany' && <span style={{ textAlign: 'center' }}>역할</span>}
            <span style={{ textAlign: 'center' }}>결과</span>
            <span style={{ textAlign: 'center' }}>점수</span>
          </div>
          {parts.map((p, i) => (
            <div key={p.player_id} style={{ display: 'grid', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.08)',
              gridTemplateColumns: gameType === 'mafia' ? '1fr 120px 100px 80px' : gameType === 'team' ? '1fr 80px 100px 80px' : gameType === 'onevsmany' ? '1fr 120px 100px 80px' : '1fr 100px 80px',
            }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{p.nickname}</span>
              {gameType === 'mafia' && (
                <select value={p.role} onChange={e => update(i, { role: e.target.value })}
                  style={{ padding: '0.3rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', cursor: 'pointer', outline: 'none' }}>
                  <option value="시민">시민</option><option value="마피아">마피아</option><option value="경찰">경찰</option><option value="의사">의사</option>
                </select>
              )}
              {gameType === 'team' && (
                <select value={p.team} onChange={e => update(i, { team: e.target.value })}
                  style={{ padding: '0.3rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', cursor: 'pointer', outline: 'none' }}>
                  <option value="A">A팀</option><option value="B">B팀</option><option value="C">C팀</option><option value="D">D팀</option>
                </select>
              )}
              {gameType === 'onevsmany' && (
                <select value={p.role} onChange={e => update(i, { role: e.target.value })}
                  style={{ padding: '0.3rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', cursor: 'pointer', outline: 'none' }}>
                  <option value="다수">다수</option><option value="단독">단독</option>
                </select>
              )}
              <button onClick={() => update(i, { is_winner: !p.is_winner })} style={{
                padding: '0.3rem 0.6rem', border: `1px solid ${p.is_winner ? '#4ade80' : 'rgba(201,168,76,0.2)'}`,
                background: p.is_winner ? 'rgba(74,222,128,0.12)' : 'transparent',
                color: p.is_winner ? '#4ade80' : 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', cursor: 'pointer', textAlign: 'center',
              }}>{p.is_winner ? '승리' : '패배'}</button>
              <input type="number" value={p.score} onChange={e => update(i, { score: e.target.value })}
                placeholder="점수"
                style={{ textAlign: 'center', padding: '0.3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.8rem', width: '100%', outline: 'none' }}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ ...s, fontSize: '0.65rem', color: '#ff8888', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={submit} disabled={submitting} style={{
        padding: '0.7rem 2.4rem', background: submitting ? 'rgba(251,146,60,0.3)' : '#fb923c',
        border: 'none', color: '#0b2218', ...s, fontSize: '0.7rem',
        letterSpacing: '0.15em', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
      }}>
        {submitting ? '등록 중...' : '결과 등록 → MVP 투표 시작'}
      </button>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.5, marginTop: '0.8rem' }}>
        결과 등록 후 참가자 전원이 MVP를 투표로 선정합니다.
      </p>
    </div>
  );
}

/* ─────────────────────────────── */
/* Team Builder                    */
/* ─────────────────────────────── */
function TeamBuilder({ members, isHost, roomId, teams, onBuild }: {
  members: Member[]; isHost: boolean; roomId: string; teams: Member[][]; onBuild: (t: Member[][]) => void;
}) {
  const [numTeams, setNumTeams] = useState(2);

  const build = async () => {
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const result: Member[][] = Array.from({ length: numTeams }, () => []);
    shuffled.forEach((m, i) => result[i % numTeams].push(m));
    onBuild(result);
    await fetch(`/api/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_team_result', teams: result }),
    });
  };

  const reset = async () => {
    onBuild([]);
    await fetch(`/api/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_team_result', teams: null }),
    });
  };

  const TEAM_NAMES = ['A팀', 'B팀', 'C팀', 'D팀'];
  const TEAM_COLORS = ['var(--gold)', '#60a5fa', '#4ade80', '#f87171'];

  return (
    <div>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1.5rem' }}>
        RANDOM TEAM BUILDER — {members.length}명
      </p>

      {isHost && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--white-dim)' }}>팀 수</span>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => { setNumTeams(n); }} style={{
              width: 40, height: 36, fontFamily: "'Cinzel', serif", fontSize: '0.75rem',
              border: `1px solid ${numTeams === n ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
              background: numTeams === n ? 'rgba(201,168,76,0.1)' : 'transparent',
              color: numTeams === n ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer',
            }}>{n}</button>
          ))}
          <button onClick={build} style={{ marginLeft: '1rem', padding: '0.5rem 1.6rem', background: 'var(--gold)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', fontWeight: 600, cursor: 'pointer' }}>
            무작위 배정
          </button>
          {teams.length > 0 && (
            <button onClick={reset} style={{ padding: '0.5rem 0.8rem', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', cursor: 'pointer' }}>
              초기화
            </button>
          )}
        </div>
      )}

      {teams.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(teams.length, 2)}, 1fr)`, gap: '1rem' }}>
          {teams.map((team, ti) => (
            <div key={ti} style={{ border: `1px solid ${TEAM_COLORS[ti]}33`, padding: '1.2rem', background: `${TEAM_COLORS[ti]}08` }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.2em', color: TEAM_COLORS[ti], marginBottom: '0.8rem' }}>{TEAM_NAMES[ti]}</p>
              {team.map(m => (
                <div key={m.id} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)', padding: '0.3rem 0', borderBottom: `1px solid ${TEAM_COLORS[ti]}15` }}>
                  {m.nickname}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', color: 'var(--white-dim)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontStyle: 'italic', opacity: 0.5 }}>
          {isHost ? '위 버튼을 눌러 팀을 무작위 배정하세요' : '방장이 팀을 배정하면 여기에 표시됩니다'}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── */
/* YouTube Rule Search             */
/* ─────────────────────────────── */
function YoutubeSearch({ gameTypes, selectedGames, initialUrl, roomId, isHost }: {
  gameTypes: string[]; selectedGames: RoomGame[]; initialUrl: string | null; roomId: string; isHost: boolean;
}) {
  const [query, setQuery] = useState(gameTypes.join(' ') + ' 보드게임 룰 설명');
  const [savedUrl, setSavedUrl] = useState(initialUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const searchQuery = query.includes('보드게임') ? query : `${query} 보드게임`;
  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

  const saveUrl = async () => {
    setSaving(true);
    await fetch(`/api/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_youtube', youtube_url: savedUrl }),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const isEmbed = savedUrl.includes('youtube.com/watch') || savedUrl.includes('youtu.be/');
  const embedId = isEmbed
    ? (savedUrl.includes('youtu.be/') ? savedUrl.split('youtu.be/')[1]?.split('?')[0] : new URLSearchParams(savedUrl.split('?')[1]).get('v'))
    : null;

  return (
    <div>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>
        RULE VIDEO — 게임 룰 영상 검색
      </p>

      {/* 선택된 게임 바로가기 버튼 */}
      {selectedGames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
          {selectedGames.map(g => (
            <a key={g.boardlife_id}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(g.name + ' 보드게임 룰 설명')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.25)', color: '#ff6b6b', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', textDecoration: 'none', letterSpacing: '0.05em' }}>
              {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 16, height: 16, objectFit: 'contain', opacity: 0.8 }} />}
              {g.name} 룰 ↗
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem' }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none' }} />
        <a href={youtubeSearch} target="_blank" rel="noopener noreferrer" style={{ padding: '0.6rem 1.2rem', background: '#ff0000', border: 'none', color: '#fff', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.1em', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          YouTube 검색 ↗
        </a>
      </div>

      {isHost && (
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <input value={savedUrl} onChange={e => setSavedUrl(e.target.value)}
            placeholder="YouTube 영상 URL 붙여넣기 (방 고정)"
            style={{ flex: 1, padding: '0.55rem 0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', outline: 'none' }} />
          <button onClick={saveUrl} disabled={saving} style={{ padding: '0.55rem 1rem', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: saved ? '#4ade80' : 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', cursor: 'pointer' }}>
            {saving ? '...' : saved ? '✓ 저장됨' : '방에 고정'}
          </button>
        </div>
      )}

      {embedId && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)' }}>
          <iframe
            src={`https://www.youtube.com/embed/${embedId}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {!embedId && savedUrl && (
        <a href={savedUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--gold)', textDecoration: 'none' }}>
          ▶ 저장된 영상 열기 ↗
        </a>
      )}
    </div>
  );
}

/* ─────────────────────────────── */
/* BGM Search (melodice.org)       */
/* ─────────────────────────────── */
interface MelodiceGame { id: string; value: string; label: string; }

function BgmSearch({ gameTypes, selectedGames }: { gameTypes: string[]; selectedGames: RoomGame[] }) {
  const [query, setQuery] = useState(selectedGames[0]?.name ?? gameTypes[0] ?? '');
  const [results, setResults] = useState<MelodiceGame[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/melodice/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <div>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: '#60a5fa', marginBottom: '0.4rem' }}>
        배경음악 — 보드게임 BGM 검색
      </p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.5, marginBottom: '1rem' }}>
        melodice.org 에서 제공하는 보드게임 전용 플레이리스트
      </p>

      {/* 선택된 게임 바로가기 버튼 */}
      {selectedGames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
          {selectedGames.map(g => (
            <a key={g.boardlife_id}
              href={`https://melodice.org/playlist/${encodeURIComponent(g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))}-${new Date().getFullYear()}/`}
              target="_blank" rel="noopener noreferrer"
              onClick={async e => {
                // melodice slug는 예측 불가 — 검색으로 우회
                e.preventDefault();
                const res = await fetch(`/api/melodice/search?q=${encodeURIComponent(g.name)}`);
                const data = await res.json();
                if (data[0]?.id) {
                  window.open(`https://melodice.org/playlist/${data[0].id}/`, '_blank');
                } else {
                  window.open(`https://melodice.org/?q=${encodeURIComponent(g.name)}`, '_blank');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', textDecoration: 'none', letterSpacing: '0.05em', cursor: 'pointer' }}>
              {g.thumbnail_url && <img src={g.thumbnail_url} alt="" style={{ width: 16, height: 16, objectFit: 'contain', opacity: 0.8 }} />}
              ♪ {g.name} ↗
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="게임 이름으로 검색..."
          style={{ flex: 1, padding: '0.65rem 0.9rem', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(96,165,250,0.25)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', outline: 'none' }}
        />
        <a
          href="https://melodice.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '0.65rem 1rem', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em', textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
        >
          melodice ↗
        </a>
      </div>

      {loading && (
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'rgba(96,165,250,0.5)', letterSpacing: '0.15em' }}>검색 중...</p>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {results.map(g => (
            <a
              key={g.id}
              href={`https://melodice.org/playlist/${g.id}/`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.9rem 1.1rem', background: 'rgba(96,165,250,0.05)',
                border: '1px solid rgba(96,165,250,0.12)', textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.1)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.12)'; }}
            >
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)', margin: 0 }}>{g.value}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(96,165,250,0.5)', margin: 0, marginTop: '0.15rem', letterSpacing: '0.05em' }}>{g.label}</p>
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: '#60a5fa', letterSpacing: '0.08em', flexShrink: 0, marginLeft: '1rem' }}>
                ♪ 플레이리스트 ↗
              </span>
            </a>
          ))}
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <div style={{ padding: '2.5rem', textAlign: 'center', border: '1px dashed rgba(96,165,250,0.12)', color: 'var(--white-dim)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontStyle: 'italic', opacity: 0.5 }}>
          검색 결과가 없습니다. 영문 게임명으로 검색해보세요.
        </div>
      )}

      {!loading && !query.trim() && (
        <div style={{ padding: '2.5rem', textAlign: 'center', border: '1px dashed rgba(96,165,250,0.12)', color: 'var(--white-dim)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontStyle: 'italic', opacity: 0.4 }}>
          게임 이름을 입력하면 BGM 플레이리스트를 찾아드립니다
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── */
/* MVP Voting                      */
/* ─────────────────────────────── */
function MvpVoting({ members, roomId, isHost, votes, userVote, onVote, onFinalize }: {
  members: Member[]; roomId: string; isHost: boolean;
  votes: Record<string, number>; userVote: string | null;
  onVote: (nomineeId: string) => void;
  onFinalize: () => void;
}) {
  const [finalizing, setFinalizing] = useState(false);
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...Object.values(votes), 0);

  return (
    <div>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: '#e879f9', marginBottom: '0.5rem' }}>
        MVP VOTE — 이번 게임의 MVP를 선정하세요
      </p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.6, marginBottom: '2rem' }}>
        한 명을 선택해 투표하세요. MVP는 +1 <LapisIcon size={12} /> LAPIS 보너스를 받습니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '2rem' }}>
        {members.map(m => {
          const count = votes[m.id] ?? 0;
          const isMyVote = userVote === m.id;
          const isLeading = count === maxVotes && count > 0;
          return (
            <button key={m.id} onClick={() => onVote(m.id)} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem',
              background: isMyVote ? 'rgba(232,121,249,0.1)' : 'rgba(30,74,52,0.2)',
              border: `1px solid ${isMyVote ? '#e879f9' : isLeading ? 'rgba(232,121,249,0.3)' : 'rgba(201,168,76,0.1)'}`,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${isMyVote ? '#e879f9' : 'rgba(201,168,76,0.3)'}`, background: 'rgba(30,74,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: isMyVote ? '#e879f9' : 'var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
                {m.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.avatar_url} alt={m.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : m.nickname[0]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: isMyVote ? '#e879f9' : 'var(--foreground)' }}>
                  {m.nickname}
                  {isMyVote && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: '#e879f9', marginLeft: '0.6rem' }}>내 투표</span>}
                  {isLeading && !isMyVote && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: '#fb923c', marginLeft: '0.6rem' }}>선두</span>}
                </p>
                <div style={{ marginTop: '0.4rem', height: 3, background: 'rgba(201,168,76,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: totalVotes > 0 ? `${(count / members.length) * 100}%` : '0%', background: isMyVote ? '#e879f9' : '#fb923c', transition: 'width 0.4s ease' }} />
                </div>
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', color: isMyVote ? '#e879f9' : count > 0 ? '#fb923c' : 'rgba(201,168,76,0.3)', flexShrink: 0, minWidth: 24, textAlign: 'center' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', background: 'rgba(30,74,52,0.15)', border: '1px solid rgba(201,168,76,0.1)', marginBottom: '1.5rem' }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', letterSpacing: '0.1em' }}>
          {totalVotes} / {members.length}명 투표 완료
        </span>
        {totalVotes === members.length && (
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#4ade80' }}>✓ 모든 투표 완료</span>
        )}
      </div>

      {isHost && (
        <button onClick={async () => { setFinalizing(true); await onFinalize(); setFinalizing(false); }} disabled={finalizing} style={{
          padding: '0.7rem 2.4rem', background: finalizing ? 'rgba(232,121,249,0.3)' : '#e879f9',
          border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.7rem',
          letterSpacing: '0.15em', fontWeight: 700, cursor: finalizing ? 'not-allowed' : 'pointer',
        }}>
          {finalizing ? '처리 중...' : '투표 종료 & 방 닫기'}
        </button>
      )}
      {!isHost && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.5 }}>
          방장이 투표를 종료하면 MVP 결과가 확정됩니다.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────── */
/* Host Manage Tab                 */
/* ─────────────────────────────── */
function HostManageTab({ members, spectators, status, roomId, hostId, pendingInvitations, isOnline, roomInfo, onKick, onInvite, onReopen, onStart, onToggleOnline, onGoResult, onRoomInfoSaved }: {
  members: Member[];
  spectators: Spectator[];
  status: string;
  roomId: string;
  hostId: string;
  pendingInvitations: { invitee_id: string; invitee: { nickname: string; username: string } }[];
  isOnline: boolean;
  roomInfo: {
    title: string | null; location: string; scheduled_at: string;
    game_types: string[]; max_players: number; note: string | null;
    boardlife_game_id: string | null; boardlife_game_name: string | null; boardlife_game_thumb: string | null;
  };
  onKick: (id: string, nickname: string) => void;
  onInvite: (id: string, invitee: { nickname: string; username: string }) => Promise<boolean>;
  onReopen: () => void;
  onStart: () => void;
  onToggleOnline: (val: boolean) => void;
  onGoResult: () => void;
  onRoomInfoSaved: (updated: { title: string | null; location: string; scheduled_at: string; game_types: string[]; max_players: number; note: string | null; boardlife_game_id: string | null; boardlife_game_name: string | null; boardlife_game_thumb: string | null; is_online?: boolean }) => void;
}) {
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; nickname: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const memberIds = new Set(members.map(m => m.id));
  const spectatorIds = new Set(spectators.map(s => s.id));
  const invitedIds = new Set(pendingInvitations.map(i => i.invitee_id));

  // 방 정보 수정 상태
  const sd = new Date(roomInfo.scheduled_at);
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const toLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const GAME_TYPES_LIST = ['마피아', '유로', '전략', '머더미스터리', '순위전', '협력', '파티', '덱빌딩', '워게임', '기타'];
  const [editTitle, setEditTitle]       = useState(roomInfo.title ?? '');
  const [editLocation, setEditLocation] = useState(roomInfo.location);
  const [editDate, setEditDate]         = useState(toLocalDate(sd));
  const [editTime, setEditTime]         = useState(toLocalTime(sd));
  const [editTypes, setEditTypes]       = useState<string[]>(roomInfo.game_types);
  const [editMax, setEditMax]           = useState(roomInfo.max_players);
  const [editNote, setEditNote]         = useState(roomInfo.note ?? '');
  const [editOnline, setEditOnline]     = useState(isOnline);
  const [editCustomType, setEditCustomType] = useState('');
  const [editBLGame, setEditBLGame]     = useState<PickedGame | null>(
    roomInfo.boardlife_game_id ? { boardlife_id: roomInfo.boardlife_game_id, name: roomInfo.boardlife_game_name ?? '', thumbnail_url: roomInfo.boardlife_game_thumb ?? null, boardlife_url: `https://boardlife.co.kr/game/${roomInfo.boardlife_game_id}` } : null
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const toggleEditType = (t: string) => setEditTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const addEditCustom = () => { const v = editCustomType.trim(); if (v && !editTypes.includes(v)) setEditTypes(prev => [...prev, v]); setEditCustomType(''); };

  async function handleSaveRoomInfo() {
    if (!editLocation || !editDate || !editTime) return;
    setSaving(true);
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle || undefined,
        location: editLocation,
        scheduled_at: new Date(`${editDate}T${editTime}:00`).toISOString(),
        game_types: editTypes,
        max_players: editMax,
        note: editNote || undefined,
        is_online: editOnline,
        boardlife_game_id: editBLGame?.boardlife_id || undefined,
        boardlife_game_name: editBLGame?.name || undefined,
        boardlife_game_thumb: editBLGame?.thumbnail_url || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setSaveMsg('오류: ' + d.error); return; }
    const updated = await res.json();
    setSaveMsg('저장됐습니다');
    onRoomInfoSaved({ ...updated });
    onToggleOnline(editOnline);
    setTimeout(() => setSaveMsg(''), 2500);
  }

  async function doSearch(q: string) {
    setSearchQ(q);
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data);
    setSearching(false);
  }

  async function doInvite(p: { id: string; nickname: string; username: string }) {
    setInviting(p.id);
    const ok = await onInvite(p.id, { nickname: p.nickname, username: p.username });
    if (ok) {
      setSearchQ('');
      setSearchResults([]);
    }
    setInviting(null);
  }

  const s = { fontFamily: "'Cinzel', serif" as const };

  const inputS: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.8rem', boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(201,168,76,0.2)',
    color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* 방 정보 수정 */}
      <div>
        <p style={{ ...s, fontSize: '0.55rem', letterSpacing: '0.2em', color: '#4ade80', marginBottom: '1.2rem' }}>방 정보 수정</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* 방 이름 */}
          <div>
            <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>방 이름 (선택)</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="방 이름" style={inputS} />
          </div>

          {/* 모임 방식 */}
          <div>
            <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>모임 방식</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {([false, true] as const).map(online => (
                <button key={String(online)} type="button" onClick={() => setEditOnline(online)}
                  style={{ ...s, flex: 1, padding: '0.6rem', fontSize: '0.6rem', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${editOnline === online ? (online ? 'rgba(96,165,250,0.6)' : 'rgba(74,222,128,0.6)') : 'rgba(201,168,76,0.2)'}`, background: editOnline === online ? (online ? 'rgba(96,165,250,0.1)' : 'rgba(74,222,128,0.1)') : 'transparent', color: editOnline === online ? (online ? '#60a5fa' : '#4ade80') : 'var(--white-dim)' }}>
                  {online ? '🌐 온라인' : '📍 오프라인'}
                </button>
              ))}
            </div>
          </div>

          {/* 이번 모임 게임 */}
          <div>
            <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>이번 모임 게임 (선택)</label>
            <BoardlifeGamePicker value={editBLGame} onChange={setEditBLGame} placeholder="플레이할 보드게임 검색..." />
          </div>

          {/* 게임 종류 */}
          <div>
            <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>게임 종류</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
              {GAME_TYPES_LIST.map(t => (
                <button key={t} type="button" onClick={() => toggleEditType(t)} style={{ ...s, width: 'auto', padding: '0.25rem 0.65rem', fontSize: '0.58rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${editTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'rgba(201,168,76,0.18)'}`, background: editTypes.includes(t) ? `${TYPE_COLOR[t] ?? 'var(--gold)'}18` : 'transparent', color: editTypes.includes(t) ? TYPE_COLOR[t] ?? 'var(--gold)' : 'var(--white-dim)' }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input value={editCustomType} onChange={e => setEditCustomType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditCustom(); }}} placeholder="직접 입력 후 Enter" style={{ ...inputS, flex: 1 }} />
              <button type="button" onClick={addEditCustom} style={{ ...inputS, width: 'auto', padding: '0 0.8rem', cursor: 'pointer', color: 'var(--gold)' }}>추가</button>
            </div>
            {editTypes.length > 0 && (
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {editTypes.map(t => (
                  <span key={t} onClick={() => toggleEditType(t)} style={{ ...s, fontSize: '0.52rem', padding: '0.12rem 0.45rem', border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold)'}55`, color: TYPE_COLOR[t] ?? 'var(--gold)', cursor: 'pointer', background: `${TYPE_COLOR[t] ?? 'var(--gold)'}12` }}>{t} ✕</span>
                ))}
              </div>
            )}
          </div>

          {/* 모임 장소 */}
          <div>
            <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>모임 장소 *</label>
            <input value={editLocation} onChange={e => setEditLocation(e.target.value)} required style={inputS} />
          </div>

          {/* 날짜 / 시간 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>날짜 *</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputS} />
            </div>
            <div>
              <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>시간 *</label>
              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={inputS} />
            </div>
          </div>

          {/* 최대 인원 */}
          <div>
            <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>최대 인원</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => setEditMax(n)} style={{ ...s, width: 38, height: 38, padding: 0, fontSize: '0.68rem', border: `1px solid ${editMax === n ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: editMax === n ? 'rgba(201,168,76,0.12)' : 'transparent', color: editMax === n ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>메모 (선택)</label>
            <input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="레벨 무관, 초보 환영 등" style={inputS} />
          </div>

          {/* 저장 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleSaveRoomInfo} disabled={saving || !editLocation}
              style={{ ...s, padding: '0.7rem 2rem', background: saving || !editLocation ? 'rgba(201,168,76,0.25)' : 'var(--gold)', border: 'none', color: '#0b2218', fontSize: '0.62rem', letterSpacing: '0.15em', fontWeight: 700, cursor: saving || !editLocation ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {saving ? '저장 중...' : '저장하기'}
            </button>
            {saveMsg && <span style={{ ...s, fontSize: '0.58rem', color: saveMsg.startsWith('오류') ? '#f87171' : '#4ade80' }}>{saveMsg}</span>}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }} />

      {/* 방 상태 */}
      <div>
        <p style={{ ...s, fontSize: '0.55rem', letterSpacing: '0.2em', color: '#4ade80', marginBottom: '0.8rem' }}>방 상태</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
          {(['open', 'full'] as const).map(v => (
            <button key={v} onClick={() => { if (status !== v && status === 'playing') onReopen(); }}
              disabled={status === v || status === 'playing' && v !== 'open'}
              style={{ ...s, flex: 1, padding: '0.65rem', fontSize: '0.6rem', letterSpacing: '0.12em', cursor: status === v ? 'default' : 'pointer', transition: 'all 0.15s', border: `1px solid ${status === v ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.2)'}`, background: status === v ? 'rgba(201,168,76,0.12)' : 'transparent', color: status === v ? 'var(--gold)' : 'var(--white-dim)', opacity: (status !== v && !['open','full'].includes(status)) ? 0.3 : 1 }}>
              📢 모집중
            </button>
          )).slice(0, 1)}
          <button onClick={() => { if (['open','full'].includes(status)) onStart(); }}
            disabled={status === 'playing'}
            style={{ ...s, flex: 1, padding: '0.65rem', fontSize: '0.6rem', letterSpacing: '0.12em', cursor: status === 'playing' ? 'default' : 'pointer', transition: 'all 0.15s', border: `1px solid ${status === 'playing' ? 'rgba(251,146,60,0.6)' : 'rgba(251,146,60,0.25)'}`, background: status === 'playing' ? 'rgba(251,146,60,0.12)' : 'transparent', color: status === 'playing' ? '#fb923c' : 'var(--white-dim)' }}>
            🎮 게임중
          </button>
        </div>
        {status === 'playing' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onReopen} style={{ ...s, padding: '0.5rem 1.2rem', background: 'transparent', border: '1px solid rgba(96,165,250,0.35)', color: '#60a5fa', fontSize: '0.58rem', letterSpacing: '0.1em', cursor: 'pointer' }}>
              ↩ 모집중으로 돌아가기
            </button>
            <button onClick={onGoResult} style={{ ...s, padding: '0.5rem 1.2rem', background: '#fb923c', border: 'none', color: '#0b2218', fontSize: '0.58rem', letterSpacing: '0.1em', fontWeight: 700, cursor: 'pointer' }}>
              결과 등록 →
            </button>
          </div>
        )}
      </div>


      {/* 참여자 관리 */}
      <div>
        <p style={{ ...s, fontSize: '0.55rem', letterSpacing: '0.2em', color: '#4ade80', marginBottom: '1rem' }}>
          참여자 관리 ({members.length}명)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1rem', background: 'rgba(30,74,52,0.15)', borderLeft: `2px solid ${m.id === hostId ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}` }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${m.id === hostId ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`, background: 'rgba(30,74,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...s, fontSize: '0.7rem', color: 'var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
                {m.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.avatar_url} alt={m.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : m.nickname[0]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>
                  {m.nickname}
                  {m.id === hostId && <span style={{ ...s, fontSize: '0.48rem', color: 'var(--gold)', marginLeft: '0.5rem', border: '1px solid var(--gold)', padding: '0.05rem 0.3rem' }}>방장</span>}
                </p>
                <p style={{ ...s, fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.4 }}>@{m.username}</p>
              </div>
              {m.id !== hostId && (
                <button onClick={() => onKick(m.id, m.nickname)} style={{ ...s, padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.52rem', letterSpacing: '0.08em', cursor: 'pointer' }}>
                  내보내기
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 초대 대기 */}
        {pendingInvitations.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold)', opacity: 0.6, marginBottom: '0.5rem' }}>초대 수락 대기 ({pendingInvitations.length}명)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pendingInvitations.map(inv => (
                <div key={inv.invitee_id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', background: 'rgba(201,168,76,0.04)', borderLeft: '2px solid rgba(201,168,76,0.2)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...s, fontSize: '0.62rem', color: 'var(--gold)', flexShrink: 0 }}>
                    {inv.invitee.nickname[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'rgba(244,239,230,0.6)' }}>{inv.invitee.nickname}</p>
                    <p style={{ ...s, fontSize: '0.48rem', color: 'var(--white-dim)', opacity: 0.35 }}>@{inv.invitee.username}</p>
                  </div>
                  <span style={{ ...s, fontSize: '0.48rem', color: 'rgba(201,168,76,0.5)', border: '1px solid rgba(201,168,76,0.2)', padding: '0.1rem 0.4rem' }}>대기중</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 관전자 */}
        {spectators.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ ...s, fontSize: '0.52rem', letterSpacing: '0.15em', color: '#60a5fa', opacity: 0.7, marginBottom: '0.5rem' }}>관전자 ({spectators.length}명)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {spectators.map(s2 => (
                <div key={s2.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', background: 'rgba(96,165,250,0.04)', borderLeft: '2px solid rgba(96,165,250,0.15)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', ...s, fontSize: '0.62rem', color: '#60a5fa', flexShrink: 0 }}>
                    {s2.nickname[0]}
                  </div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'rgba(244,239,230,0.55)', flex: 1 }}>{s2.nickname}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 초대 */}
      <div>
        <p style={{ ...s, fontSize: '0.55rem', letterSpacing: '0.2em', color: '#4ade80', marginBottom: '1rem' }}>멤버 초대</p>
        <input
          value={searchQ}
          onChange={e => doSearch(e.target.value)}
          placeholder="닉네임 또는 아이디 검색..."
          style={{ width: '100%', padding: '0.6rem 0.9rem', background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
        />
        {searching && <p style={{ ...s, fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.4, marginTop: '0.5rem' }}>검색 중...</p>}
        {searchResults.length > 0 && (
          <div style={{ marginTop: '0.4rem', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(11,34,24,0.95)' }}>
            {searchResults.map(p => {
              const alreadyIn = memberIds.has(p.id) || spectatorIds.has(p.id);
              const alreadyInvited = invitedIds.has(p.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0.9rem', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: alreadyIn ? 'var(--white-dim)' : 'var(--foreground)' }}>{p.nickname}</p>
                    <p style={{ ...s, fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.4 }}>@{p.username}</p>
                  </div>
                  {alreadyIn ? (
                    <span style={{ ...s, fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.4 }}>참가중</span>
                  ) : alreadyInvited ? (
                    <span style={{ ...s, fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', border: '1px solid rgba(201,168,76,0.2)', padding: '0.15rem 0.4rem' }}>대기중</span>
                  ) : (
                    <button onClick={() => doInvite(p)} disabled={inviting === p.id} style={{ ...s, padding: '0.3rem 0.8rem', background: inviting === p.id ? 'rgba(201,168,76,0.3)' : 'var(--gold)', border: 'none', color: '#0b2218', fontSize: '0.55rem', fontWeight: 700, cursor: 'pointer' }}>
                      {inviting === p.id ? '...' : '초대'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
