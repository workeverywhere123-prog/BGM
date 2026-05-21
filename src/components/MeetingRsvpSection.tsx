'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function useCountdown(deadline: string | null) {
  const calc = () => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, diff };
  };
  const [r, setR] = useState(calc);
  useEffect(() => { const t = setInterval(() => setR(calc()), 1000); return () => clearInterval(t); });
  return r;
}

interface Player { id: string; nickname: string; username: string; avatar_url?: string | null; }
interface RsvpEntry { player_id: string; status: string; players: Player | null; }

export default function MeetingRsvpSection({
  meetingId, currentUserId, rsvpDeadline, initialAttending, initialAbsent, initialMyStatus,
}: {
  meetingId: string;
  currentUserId: string | null;
  rsvpDeadline: string | null;
  initialAttending: RsvpEntry[];
  initialAbsent: RsvpEntry[];
  initialMyStatus: string | null;
}) {
  const [attending, setAttending] = useState<RsvpEntry[]>(initialAttending);
  const [absent, setAbsent]       = useState<RsvpEntry[]>(initialAbsent);
  const [myStatus, setMyStatus]   = useState<string | null>(initialMyStatus);
  const [isPending, startT]       = useTransition();
  const countdown = useCountdown(rsvpDeadline);
  const isClosed = rsvpDeadline ? new Date(rsvpDeadline) <= new Date() : false;
  const isUrgent = countdown ? countdown.diff < 1800000 : false;

  // 실시간 반영
  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/meeting/rsvp?meeting_id=${meetingId}`);
      if (!res.ok) return;
      const data: RsvpEntry[] = await res.json();
      setAttending(data.filter(r => r.status === 'attending'));
      setAbsent(data.filter(r => r.status === 'absent'));
      if (currentUserId) {
        const mine = data.find(r => r.player_id === currentUserId);
        setMyStatus(mine?.status ?? null);
      }
    } catch {}
  }, [meetingId, currentUserId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase.channel(`rsvp-${meetingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_rsvps', filter: `meeting_id=eq.${meetingId}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [meetingId, reload]);

  const vote = (status: 'attending' | 'absent') => startT(async () => {
    if (!currentUserId || isClosed) return;
    if (myStatus === status) {
      await fetch('/api/meeting/rsvp', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meeting_id: meetingId }) });
    } else {
      await fetch('/api/meeting/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meeting_id: meetingId, status }) });
    }
    await reload();
  });

  const total = attending.length + absent.length;
  const attendPct = total > 0 ? Math.round((attending.length / total) * 100) : 0;
  const absentPct = total > 0 ? 100 - attendPct : 0;

  return (
    <div>
      {/* 마감 시간 표시 */}
      {rsvpDeadline && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', padding: '0.7rem 1rem', border: `1px solid ${isClosed ? 'rgba(248,113,113,0.2)' : isUrgent ? 'rgba(251,146,60,0.3)' : 'rgba(201,168,76,0.15)'}`, background: isClosed ? 'rgba(248,113,113,0.05)' : 'rgba(8,20,14,0.4)' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.12em', color: isClosed ? '#f87171' : isUrgent ? '#fb923c' : 'var(--gold-dim)' }}>
            {isClosed ? '⛔ 투표 마감됨' : '⏱ 투표 마감'}
          </span>
          {!isClosed && countdown && (
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.08em', color: isUrgent ? '#fb923c' : 'var(--gold-dim)', fontWeight: isUrgent ? 700 : 400 }}>
              {countdown.d > 0 && `${countdown.d}일 `}{countdown.h > 0 && `${countdown.h}시간 `}{countdown.m}분{isUrgent && ` ${countdown.s}초`} 남음
            </span>
          )}
          {isClosed && (
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#f87171', opacity: 0.7 }}>
              미참여 시 LAPIS -1 적용됨
            </span>
          )}
        </div>
      )}

      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '1.5rem' }}>
        ATTENDANCE — 참석 여부
      </p>

      {/* 카카오톡 스타일 투표 행 */}
      <div style={{ border: `1px solid ${isClosed ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.18)'}`, background: 'rgba(8,20,14,0.55)', overflow: 'hidden', marginBottom: '1.5rem', opacity: isClosed ? 0.75 : 1 }}>
        <VoteRow label="참석" count={attending.length} pct={attendPct} color="#4ade80"
          isMyVote={myStatus === 'attending'} canVote={!!currentUserId && !isPending && !isClosed}
          onClick={() => vote('attending')} voters={attending} currentUserId={currentUserId} />
        <div style={{ height: 1, background: 'rgba(201,168,76,0.08)' }} />
        <VoteRow label="불참" count={absent.length} pct={absentPct} color="#f87171"
          isMyVote={myStatus === 'absent'} canVote={!!currentUserId && !isPending && !isClosed}
          onClick={() => vote('absent')} voters={absent} currentUserId={currentUserId} />
      </div>

      {/* 안내 */}
      {!currentUserId && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.3)', textAlign: 'center' }}>
          참석 여부를 등록하려면 <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>로그인</Link>하세요
        </p>
      )}
      {currentUserId && myStatus && !isClosed && (
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.1em', color: 'rgba(244,239,230,0.25)', textAlign: 'center' }}>
          재클릭하면 취소됩니다
        </p>
      )}
    </div>
  );
}

function VoteRow({ label, count, pct, color, isMyVote, canVote, onClick, voters, currentUserId }: {
  label: string; count: number; pct: number; color: string;
  isMyVote: boolean; canVote: boolean; onClick: () => void;
  voters: RsvpEntry[]; currentUserId: string | null;
}) {
  return (
    <div>
      <button
        onClick={canVote ? onClick : undefined}
        disabled={!canVote}
        style={{
          width: '100%', position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.2rem',
          background: isMyVote ? `${color}0d` : 'transparent',
          border: 'none', cursor: canVote ? 'pointer' : 'default',
          textAlign: 'left', transition: 'background 0.15s',
        }}
      >
        {/* 진행 바 */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: `${color}10`,
          transition: 'width 0.4s ease',
          pointerEvents: 'none',
        }} />

        {/* 왼쪽: 체크 + 라벨 */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${isMyVote ? color : `${color}44`}`,
            background: isMyVote ? `${color}22` : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', color: isMyVote ? color : 'transparent',
            transition: 'all 0.15s',
          }}>
            {isMyVote && '✓'}
          </div>
          <span style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.15em',
            color: isMyVote ? color : `${color}88`,
          }}>
            {label}
          </span>
        </div>

        {/* 오른쪽: 퍼센트 + 인원 */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.7rem', flexShrink: 0 }}>
          {pct > 0 && (
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: `${color}66`, letterSpacing: '0.05em' }}>
              {pct}%
            </span>
          )}
          <span style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem',
            color: isMyVote ? color : `${color}66`, fontWeight: 600, minWidth: 24, textAlign: 'right',
          }}>
            {count}
          </span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.3)', letterSpacing: '0.05em' }}>명</span>
        </div>
      </button>

      {/* 투표자 목록 */}
      {voters.length > 0 && (
        <div style={{ padding: '0 1.2rem 0.9rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {voters.map(r => {
            const p = r.players;
            const isMe = r.player_id === currentUserId;
            const nickname = p?.nickname ?? (isMe ? '나' : '멤버');
            const username = p?.username ?? '';
            const chip = (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.05em',
                padding: '0.2rem 0.55rem',
                border: `1px solid ${isMe ? color : `${color}33`}`,
                color: isMe ? color : `${color}77`,
                background: isMe ? `${color}0d` : 'transparent',
              }}>
                {p?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: `${color}22`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4rem', color }}>
                    {nickname[0]}
                  </span>
                )}
                {nickname}
              </span>
            );
            if (!username) return <span key={r.player_id}>{chip}</span>;
            return <Link key={r.player_id} href={`/profile/${username}`} style={{ textDecoration: 'none' }}>{chip}</Link>;
          })}
        </div>
      )}
    </div>
  );
}
