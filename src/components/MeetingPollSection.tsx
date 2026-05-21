'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface PollOption { label: string; date: string; time?: string }
interface Poll {
  id: string; title: string; description: string | null;
  options: PollOption[]; deadline: string; status: 'open' | 'closed';
  optionVotes: string[][];
}
interface Meeting { id: string; number: number; held_at: string; status: string; note: string | null; }

function useCountdown(deadline: string) {
  const calc = () => {
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

function Countdown({ deadline }: { deadline: string }) {
  const r = useCountdown(deadline);
  if (!r) return <span style={{ color: '#f87171', fontFamily: "'Cinzel', serif", fontSize: '0.58rem' }}>마감됨</span>;
  const color = r.diff < 1800000 ? '#f87171' : r.diff < 3600000 ? '#fb923c' : 'var(--gold-dim)';
  return (
    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.08em', color }}>
      {r.d > 0 && `${r.d}일 `}{r.h > 0 && `${r.h}시간 `}{r.m}분{r.diff < 3600000 && ` ${r.s}초`} 남음
    </span>
  );
}

export default function MeetingPollSection({
  currentUserId, upcomingMeetings = [],
}: {
  currentUserId: string | null;
  upcomingMeetings?: Meeting[];
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/meeting/polls');
      const data = await res.json();
      setPolls(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ch = supabase.channel('meeting-poll-votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_poll_votes' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meeting_polls' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const toggleVote = async (pollId: string, optionIndex: number, key: string) => {
    if (!currentUserId || voting) return;
    setVoting(key);
    try {
      await fetch(`/api/meeting/polls/${pollId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_index: optionIndex }),
      });
      await load();
    } catch {}
    setVoting(null);
  };

  const activePolls = polls.filter(p => p.status === 'open' && new Date(p.deadline) > new Date());
  const closedPolls = polls.filter(p => p.status === 'closed' || new Date(p.deadline) <= new Date());

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Header — 스크롤 범위 밖 */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p className="section-label">BGM SCHEDULE</p>
        <h2 className="section-title" style={{ fontSize: '2rem' }}>모임 일정</h2>
        <div className="section-divider" />
      </div>

      {/* 스크롤 영역 */}
      <div className="thin-scroll" style={{ maxHeight: '35vh', overflowY: 'auto', paddingRight: '0.4rem' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', opacity: 0.3 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.2em', color: 'var(--gold)' }}>LOADING...</span>
        </div>
      ) : (
        <>
          {/* 예정된 모임 카드 */}
          {upcomingMeetings.length > 0 && (
            <div style={{ marginBottom: activePolls.length ? '2rem' : 0 }}>
              {upcomingMeetings.map(m => {
                const d = new Date(m.held_at);
                const isActive = m.status === 'active';
                const days = ['일','월','화','수','목','금','토'];
                return (
                  <a key={m.id} href={`/meeting/${m.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '0.7rem' }}>
                    <div style={{
                      border: `1px solid ${isActive ? 'rgba(74,222,128,0.45)' : 'rgba(201,168,76,0.22)'}`,
                      background: isActive ? 'rgba(8,40,20,0.55)' : 'rgba(8,20,14,0.55)',
                      padding: '1.2rem 1.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                      transition: 'border-color 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {/* 날짜 */}
                        <div style={{ textAlign: 'center', minWidth: 44 }}>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.8rem', lineHeight: 1, color: isActive ? '#4ade80' : 'var(--gold)', fontWeight: 700 }}>
                            {d.getDate()}
                          </div>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', marginTop: '0.1rem' }}>
                            {d.getMonth() + 1}M · {days[d.getDay()]}
                          </div>
                        </div>
                        {/* 정보 */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            {isActive && (
                              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.42rem', letterSpacing: '0.12em', color: '#4ade80', border: '1px solid #4ade8033', padding: '0.06rem 0.35rem' }}>LIVE</span>
                            )}
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.1em', color: 'var(--gold-dim)' }}>제{m.number}회 정기 모임</span>
                          </div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>
                            {d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            &nbsp;
                            {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {m.note && (
                            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.15rem' }}>
                              {m.note}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* 참석 투표 버튼 */}
                      <span style={{
                        fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.1em',
                        color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.35)',
                        padding: '0.45rem 1rem', whiteSpace: 'nowrap', flexShrink: 0,
                        background: 'rgba(201,168,76,0.05)',
                      }}>
                        참석 투표 →
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* 활성 일정 투표 */}
          {activePolls.map(poll => (
            <PollCard key={poll.id} poll={poll} currentUserId={currentUserId} voting={voting} onVote={toggleVote} isOpen />
          ))}

          {/* 마감된 투표 */}
          {closedPolls.length > 0 && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.12em', color: 'rgba(244,239,230,0.2)', cursor: 'pointer', userSelect: 'none', listStyle: 'none' }}>
                ▸ 마감된 투표 ({closedPolls.length})
              </summary>
              <div style={{ marginTop: '0.8rem', opacity: 0.6 }}>
                {closedPolls.map(poll => (
                  <PollCard key={poll.id} poll={poll} currentUserId={currentUserId} voting={null} onVote={async () => {}} isOpen={false} />
                ))}
              </div>
            </details>
          )}

          {/* 모임도 없고 투표도 없을 때 */}
          {upcomingMeetings.length === 0 && polls.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(201,168,76,0.12)', background: 'rgba(8,20,14,0.4)' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>
                예정된 모임이 없습니다
              </p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

function PollCard({ poll, currentUserId, voting, onVote, isOpen }: {
  poll: Poll; currentUserId: string | null; voting: string | null;
  onVote: (pollId: string, optIdx: number, key: string) => void; isOpen: boolean;
}) {
  const totalVoters = [...new Set(poll.optionVotes.flat())].length;
  const maxVotes = Math.max(...poll.optionVotes.map(v => v.length), 1);
  const winnerCount = Math.max(...poll.optionVotes.map(v => v.length));

  return (
    <div style={{ border: `1px solid ${isOpen ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.08)'}`, background: 'rgba(8,20,14,0.6)', padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.42rem', letterSpacing: '0.12em', color: isOpen ? '#4ade80' : 'rgba(244,239,230,0.25)', border: `1px solid ${isOpen ? '#4ade8033' : 'rgba(244,239,230,0.08)'}`, padding: '0.08rem 0.35rem' }}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.42rem', color: 'rgba(244,239,230,0.25)' }}>{totalVoters}명 참여</span>
          </div>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', color: 'var(--foreground)', fontStyle: 'italic', margin: 0 }}>{poll.title}</h3>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.4rem', color: 'rgba(244,239,230,0.25)', marginBottom: '0.2rem' }}>마감</div>
          {isOpen ? <Countdown deadline={poll.deadline} /> : (
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.2)' }}>
              {new Date(poll.deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {poll.options.map((opt, i) => {
          const votes = poll.optionVotes[i] ?? [];
          const myVote = currentUserId ? votes.includes(currentUserId) : false;
          const pct = (votes.length / maxVotes) * 100;
          const winner = !isOpen && votes.length === winnerCount && winnerCount > 0;
          const key = `${poll.id}-${i}`;
          return (
            <button key={i} onClick={() => isOpen && currentUserId && onVote(poll.id, i, key)}
              disabled={!isOpen || !currentUserId || !!voting}
              style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', border: `1px solid ${winner ? 'rgba(74,222,128,0.4)' : myVote ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.12)'}`, background: 'transparent', cursor: isOpen && currentUserId ? 'pointer' : 'default', textAlign: 'left' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: winner ? 'rgba(74,222,128,0.08)' : myVote ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.03)', transition: 'width 0.4s ease' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${myVote ? 'var(--gold)' : winner ? '#4ade80' : 'rgba(201,168,76,0.2)'}`, background: myVote ? 'rgba(201,168,76,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: myVote ? 'var(--gold)' : 'transparent', flexShrink: 0 }}>
                  {myVote ? '✓' : winner ? <span style={{ color: '#4ade80' }}>★</span> : ''}
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: winner ? '#4ade80' : myVote ? 'rgba(244,239,230,0.95)' : 'rgba(244,239,230,0.75)', fontWeight: myVote || winner ? 600 : 400 }}>{opt.label}</span>
              </div>
              <span style={{ position: 'relative', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', fontWeight: 700, color: winner ? '#4ade80' : myVote ? 'var(--gold)' : 'rgba(244,239,230,0.3)', minWidth: 20, textAlign: 'right' }}>{votes.length}</span>
            </button>
          );
        })}
      </div>
      {isOpen && !currentUserId && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.2)', marginTop: '0.7rem' }}>
          투표하려면 <a href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>로그인</a>하세요
        </p>
      )}
    </div>
  );
}
