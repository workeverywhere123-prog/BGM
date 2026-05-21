'use client';

import { useState } from 'react';
import Link from 'next/link';
import LapisIcon from '@/components/LapisIcon';

interface Raffle {
  id: string; name: string; prize: string; description: string | null;
  status: string; drawn_at: string | null; winner_id: string | null; created_at: string;
}
interface Entry {
  player_id: string; tickets: number; created_at: string;
  player: { nickname: string; username: string };
}
interface Player { id: string; nickname: string; username: string; }

export default function RaffleDetail({
  raffle, entries, totalTickets, winner, currentUserId, myBalance, myEntry, isAdmin,
}: {
  raffle: Raffle; entries: Entry[]; totalTickets: number; winner: Player | null;
  currentUserId: string | null; myBalance: number; myEntry: { tickets: number } | null; isAdmin: boolean;
}) {
  const [ticketInput, setTicketInput] = useState(myEntry?.tickets?.toString() ?? '');
  const [loading, setLoading] = useState(false);
  const [drawLoading, setDrawLoading] = useState(false);
  const [localWinner, setLocalWinner] = useState<Player | null>(winner);
  const [localStatus, setLocalStatus] = useState(raffle.status);
  const [localEntries, setLocalEntries] = useState<Entry[]>(entries);
  const [localTotal, setLocalTotal] = useState(totalTickets);
  const [localBalance, setLocalBalance] = useState(myBalance);
  const [myTickets, setMyTickets] = useState(myEntry?.tickets ?? 0);
  const [drawing, setDrawing] = useState(false);
  const [winnerReveal, setWinnerReveal] = useState(false);

  const myPct = localTotal > 0 && myTickets > 0 ? ((myTickets / localTotal) * 100).toFixed(1) : '0';
  const canEnter = localStatus === 'open' && currentUserId;

  async function handleEnter() {
    const t = parseInt(ticketInput);
    if (isNaN(t) || t < 1) return alert('1 이상의 숫자를 입력하세요');
    if (t > localBalance + myTickets) return alert(`LAPIS 부족 (보유: ${localBalance + myTickets} LAPIS)`);
    if (t <= myTickets) return alert('기존 티켓보다 많은 수를 입력하세요');
    setLoading(true);
    const res = await fetch(`/api/raffle/${raffle.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enter', tickets: t }),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.error); setLoading(false); return; }
    const added = t - myTickets;
    setLocalBalance(prev => prev - added);
    setLocalTotal(prev => prev - myTickets + t);
    setMyTickets(t);
    setLocalEntries(prev => {
      const without = prev.filter(e => e.player_id !== currentUserId);
      const me = prev.find(e => e.player_id === currentUserId);
      return [{ ...me, player_id: currentUserId!, tickets: t, player: me?.player ?? { nickname: '나', username: '' }, created_at: me?.created_at ?? new Date().toISOString() }, ...without].sort((a, b) => b.tickets - a.tickets);
    });
    setLoading(false);
  }

  async function handleClose() {
    if (!confirm('추첨 참가를 마감하시겠습니까?')) return;
    await fetch(`/api/raffle/${raffle.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    });
    setLocalStatus('closed');
  }

  async function handleDraw() {
    if (!confirm('지금 당첨자를 추첨하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setDrawLoading(true);
    setDrawing(true);
    // Dramatic delay for effect
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`/api/raffle/${raffle.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'draw' }),
    });
    const d = await res.json();
    setDrawLoading(false);
    setDrawing(false);
    if (!res.ok) { alert(d.error); return; }
    setLocalWinner(d.winner);
    setLocalStatus('drawn');
    setTimeout(() => setWinnerReveal(true), 100);
  }

  const statusInfo = {
    open: { text: '참가 모집중', color: '#4ade80' },
    closed: { text: '마감 — 추첨 대기', color: '#fb923c' },
    drawn: { text: '추첨 완료', color: 'rgba(244,239,230,0.35)' },
  }[localStatus] ?? { text: localStatus, color: 'var(--gold)' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <Link href="/raffle" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', textDecoration: 'none', letterSpacing: '0.15em', opacity: 0.5 }}>
        ← 추첨 목록
      </Link>

      <div style={{ margin: '1.5rem 0 2.5rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: statusInfo.color, marginBottom: '0.4rem' }}>
          {statusInfo.text}
        </p>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.8rem', color: 'var(--gold)', marginBottom: '0.4rem' }}>
          {raffle.name}
        </h1>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', color: 'var(--gold)', letterSpacing: '0.12em' }}>
          🎁 {raffle.prize}
        </p>
        {raffle.description && (
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', marginTop: '0.5rem' }}>
            {raffle.description}
          </p>
        )}
      </div>

      {/* 당첨자 발표 */}
      {localStatus === 'drawn' && localWinner && (
        <div style={{
          marginBottom: '2.5rem', padding: '2rem', textAlign: 'center',
          border: '1px solid rgba(201,168,76,0.5)', background: 'rgba(201,168,76,0.08)',
          transition: 'all 0.8s',
          opacity: winnerReveal ? 1 : 0,
          transform: winnerReveal ? 'scale(1)' : 'scale(0.95)',
        }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
            ✦ 당첨자 ✦
          </p>
          <p style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '2.2rem', color: 'var(--gold)', marginBottom: '0.3rem' }}>
            {localWinner.nickname}
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--white-dim)', opacity: 0.5 }}>
            @{localWinner.username}
          </p>
          {currentUserId === localWinner.id && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: '#4ade80', marginTop: '1rem', fontStyle: 'italic' }}>
              🎉 축하합니다! 당신이 당첨되었습니다!
            </p>
          )}
        </div>
      )}

      {/* 추첨 진행 중 애니메이션 */}
      {drawing && (
        <div style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.05)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'var(--gold)', animation: 'pulse 0.8s infinite' }}>
            추첨 중...
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            {localTotal}장의 추첨권 중 당첨권을 고르는 중
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem', marginBottom: '2rem' }}>
        {[
          { label: '총 참가자', value: localEntries.length + '명' },
          { label: '총 티켓', value: localTotal + '장' },
          { label: '내 티켓', value: myTickets ? `${myTickets}장 (${myPct}%)` : '미참가' },
        ].map(item => (
          <div key={item.label} style={{ padding: '1rem', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(30,74,52,0.12)', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>{item.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: 'var(--foreground)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 내 참가 */}
      {canEnter && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.06)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>
            {myTickets ? '티켓 추가 구매' : '추첨 참가'}
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', fontStyle: 'italic', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
            <LapisIcon size={13} /> LAPIS 잔액: <span style={{ color: 'var(--gold)', fontStyle: 'normal', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>{localBalance} <LapisIcon size={12} /> LAPIS</span>
            {myTickets > 0 && <span style={{ marginLeft: '0.8rem' }}>현재 티켓: <span style={{ color: '#4ade80', fontStyle: 'normal' }}>{myTickets}장</span></span>}
          </p>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={myTickets + 1}
              max={localBalance + myTickets}
              value={ticketInput}
              onChange={e => setTicketInput(e.target.value)}
              placeholder={`티켓 수 입력 (최대 ${localBalance + myTickets}장)`}
              style={{ flex: 1, minWidth: 160, padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--foreground)', fontFamily: "'Cinzel', serif", fontSize: '0.85rem', outline: 'none' }}
            />
            <button onClick={handleEnter} disabled={loading} style={{
              padding: '0.6rem 1.8rem', background: loading ? 'rgba(201,168,76,0.3)' : 'var(--gold)',
              border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.65rem',
              letterSpacing: '0.15em', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? '처리 중...' : myTickets ? '티켓 추가' : '참가하기'}
            </button>
          </div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5, marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            * 티켓 1장 = 1 <LapisIcon size={10} /> LAPIS 소모 / 입력한 총 티켓 수로 대체됩니다
          </p>
        </div>
      )}

      {!currentUserId && localStatus === 'open' && (
        <div style={{ marginBottom: '2rem', padding: '1.2rem 1.5rem', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>
          <Link href="/join" style={{ color: 'var(--gold)' }}>로그인</Link>하면 추첨에 참가할 수 있습니다
        </div>
      )}

      {/* 어드민 컨트롤 */}
      {isAdmin && (
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {localStatus === 'open' && (
            <button onClick={handleClose} style={{ padding: '0.55rem 1.4rem', background: 'transparent', border: '1px solid #fb923c', color: '#fb923c', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em', cursor: 'pointer' }}>
              참가 마감
            </button>
          )}
          {localStatus === 'closed' && (
            <button onClick={handleDraw} disabled={drawLoading} style={{ padding: '0.6rem 2rem', background: drawLoading ? 'rgba(201,168,76,0.3)' : 'var(--gold)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 700, cursor: drawLoading ? 'not-allowed' : 'pointer' }}>
              {drawLoading ? '추첨 중...' : '🎲 당첨자 추첨'}
            </button>
          )}
        </div>
      )}

      {/* 참가자 목록 */}
      <div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
          참가자 현황
        </p>
        {localEntries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
            아직 참가자가 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {localEntries.map((e, i) => {
              const pct = localTotal > 0 ? ((e.tickets / localTotal) * 100).toFixed(1) : '0';
              const isMe = e.player_id === currentUserId;
              const isWinner = localWinner?.id === e.player_id;
              return (
                <div key={e.player_id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.2rem',
                  background: isWinner ? 'rgba(201,168,76,0.12)' : isMe ? 'rgba(201,168,76,0.06)' : 'rgba(30,74,52,0.12)',
                  borderLeft: `3px solid ${isWinner ? 'var(--gold)' : isMe ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.1)'}`,
                }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: 'var(--white-dim)', minWidth: 20, opacity: 0.4 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: isWinner ? 'var(--gold)' : 'var(--foreground)' }}>
                      {e.player.nickname}
                      {isMe && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', marginLeft: '0.5rem' }}>나</span>}
                      {isWinner && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#fb923c', marginLeft: '0.5rem' }}>🏆 당첨</span>}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: 'var(--gold)' }}>{e.tickets}장</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5 }}>{pct}%</p>
                  </div>
                  {/* 당첨 확률 바 */}
                  <div style={{ width: 80, height: 4, background: 'rgba(201,168,76,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: isWinner ? 'var(--gold)' : 'rgba(201,168,76,0.5)', transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
