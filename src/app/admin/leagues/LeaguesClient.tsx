'use client';

import { useState, useTransition } from 'react';

interface Player { id: string; nickname: string; username: string; }
interface Participant { id: string; player_id: string; score: number; rank: number | null; note: string | null; player: Player; }
interface Prize { rank: number; label: string; description: string; }
interface MatchPlayer {
  id: string; player_id: string; rank: number | null; score: number | null; points_earned: number; player: Player;
}
interface ScheduleMatch {
  id: string; round: number; match_index: number; status: string; played_at: string | null;
  matchPlayers: MatchPlayer[];
}
interface League {
  id: string; name: string; description: string | null;
  start_date: string | null; end_date: string | null;
  is_active: boolean; prizes: Prize[]; created_at: string;
  players_per_game: number;
  participants: Participant[];
  schedule: ScheduleMatch[];
}

export default function LeaguesClient({ initialLeagues, allPlayers }: {
  initialLeagues: League[]; allPlayers: Player[];
}) {
  const [leagues, setLeagues]   = useState(initialLeagues);
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew]   = useState(false);
  const [isPending, startT]     = useTransition();

  const selectedLeague = leagues.find(l => l.id === selected);

  function updateLeague(id: string, patch: Partial<League>) {
    setLeagues(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function CreateForm() {
    const [name, setName]     = useState('');
    const [desc, setDesc]     = useState('');
    const [start, setStart]   = useState('');
    const [end, setEnd]       = useState('');
    const [ppg, setPpg]       = useState(4);
    const [prizes, setPrizes] = useState<Prize[]>([
      { rank: 1, label: '1위', description: '' },
      { rank: 2, label: '2위', description: '' },
      { rank: 3, label: '3위', description: '' },
    ]);
    const [active, setActive] = useState(false);

    const submit = () => startT(async () => {
      const res = await fetch('/api/admin/leagues', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, start_date: start || null, end_date: end || null, prizes, is_active: active, players_per_game: ppg }),
      });
      if (!res.ok) { alert((await res.json()).error); return; }
      const data = await res.json();
      setLeagues(prev => [{ ...data, participants: [], schedule: [] }, ...prev]);
      setShowNew(false);
    });

    return (
      <div style={{ border: '1px solid rgba(201,168,76,0.3)', padding: '1.5rem', background: 'rgba(30,74,52,0.15)', marginBottom: '2rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)', marginBottom: '1.2rem' }}>새 리그 생성</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
          <F label="리그 이름 *"><input value={name} onChange={e => setName(e.target.value)} placeholder="예: 2026 S1 리그" style={inp} /></F>
          <F label="설명"><input value={desc} onChange={e => setDesc(e.target.value)} style={inp} /></F>
          <F label="시작일"><input type="date" value={start} onChange={e => setStart(e.target.value)} style={inp} /></F>
          <F label="종료일"><input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inp} /></F>
          <F label="게임 인원 (명)">
            <select value={ppg} onChange={e => setPpg(Number(e.target.value))} style={inp}>
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}인</option>)}
            </select>
          </F>
        </div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>상품</p>
        {prizes.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)', minWidth: 28 }}>{p.rank}위</span>
            <input value={p.description} onChange={e => setPrizes(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
              placeholder="상품 내용" style={{ ...inp, flex: 1 }} />
          </div>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.8rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>즉시 활성화</span>
        </label>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          <button onClick={() => setShowNew(false)} style={{ ...btn, flex: 1 }}>취소</button>
          <button onClick={submit} disabled={!name || isPending} style={{ ...btnGold, flex: 2 }}>{isPending ? '...' : '생성'}</button>
        </div>
      </div>
    );
  }

  function LeagueDetail({ league }: { league: League }) {
    const [tab, setTab] = useState<'participants' | 'schedule'>('participants');
    const [addPlayerId, setAddPlayerId] = useState('');

    const hasSchedule = league.schedule.length > 0;
    const totalRounds = hasSchedule ? Math.max(...league.schedule.map(m => m.round)) : 0;
    const completedCount = league.schedule.filter(m => m.status === 'completed').length;

    const addParticipant = () => startT(async () => {
      if (!addPlayerId) return;
      const res = await fetch('/api/admin/leagues', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: league.id, action: 'add_participant', player_id: addPlayerId }),
      });
      if (!res.ok) { alert((await res.json()).error); return; }
      const player = allPlayers.find(p => p.id === addPlayerId)!;
      const newP: Participant = { id: Math.random().toString(), player_id: addPlayerId, score: 0, rank: null, note: null, player };
      updateLeague(league.id, { participants: [...league.participants, newP] });
      setAddPlayerId('');
    });

    const removeParticipant = (pid: string) => startT(async () => {
      if (!confirm('참가자를 제거하시겠습니까?')) return;
      await fetch('/api/admin/leagues', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: league.id, action: 'remove_participant', participant_id: pid }),
      });
      updateLeague(league.id, { participants: league.participants.filter(p => p.id !== pid) });
    });

    const toggleActive = () => startT(async () => {
      const action = league.is_active ? 'deactivate' : 'activate';
      await fetch('/api/admin/leagues', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: league.id, action }),
      });
      setLeagues(prev => prev.map(l =>
        l.id === league.id ? { ...l, is_active: !l.is_active }
        : action === 'activate' ? { ...l, is_active: false } : l
      ));
    });

    const generateSchedule = () => startT(async () => {
      if (!confirm(`참가자 ${league.participants.length}명, ${league.players_per_game}인 게임으로 균등 일정을 생성합니다.\n기존 일정과 모든 점수가 초기화됩니다.`)) return;
      const res = await fetch('/api/admin/leagues', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: league.id, action: 'generate_schedule' }),
      });
      if (!res.ok) { alert((await res.json()).error); return; }
      // Reload page to get fresh schedule data
      window.location.reload();
    });

    const resetSchedule = () => startT(async () => {
      if (!confirm('일정과 모든 점수를 초기화하시겠습니까?')) return;
      await fetch('/api/admin/leagues', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: league.id, action: 'reset_schedule' }),
      });
      updateLeague(league.id, { schedule: [], participants: league.participants.map(p => ({ ...p, score: 0 })) });
    });

    const availablePlayers = allPlayers.filter(p => !new Set(league.participants.map(x => x.player_id)).has(p.id));

    return (
      <div style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '1.5rem', background: 'rgba(30,74,52,0.1)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', color: 'var(--foreground)' }}>{league.name}</h3>
            {league.description && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>{league.description}</p>}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold-dim)', marginTop: '0.3rem' }}>
              {league.players_per_game}인 게임 · {league.start_date ?? '—'} ~ {league.end_date ?? '진행중'}
            </p>
          </div>
          <button onClick={toggleActive} disabled={isPending} style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.6rem', padding: '0.35rem 0.8rem',
            border: `1px solid ${league.is_active ? 'var(--gold)' : 'rgba(201,168,76,0.25)'}`,
            color: league.is_active ? 'var(--gold)' : 'var(--white-dim)',
            background: league.is_active ? 'rgba(201,168,76,0.1)' : 'transparent', cursor: 'pointer',
          }}>{league.is_active ? '● 활성' : '비활성'}</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(201,168,76,0.12)', marginBottom: '1.2rem' }}>
          {(['participants', 'schedule'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em',
              padding: '0.5rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === t ? 'var(--gold)' : 'var(--white-dim)',
              borderBottom: `2px solid ${tab === t ? 'var(--gold)' : 'transparent'}`,
            }}>
              {t === 'participants'
                ? `참가자 (${league.participants.length})`
                : `경기 일정${hasSchedule ? ` (${completedCount}/${league.schedule.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Participants Tab */}
        {tab === 'participants' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: '1rem' }}>
              {league.participants.sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 80px', gap: '0.6rem', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.15)' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: i < 3 ? 'var(--gold)' : 'var(--white-dim)', opacity: i < 3 ? 1 : 0.5 }}>{i + 1}</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{p.player.nickname}</span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: 'var(--gold)', textAlign: 'center' }}>{p.score}승점</span>
                  <button onClick={() => removeParticipant(p.id)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.2rem 0.5rem', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888', background: 'transparent', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              {league.participants.length === 0 && (
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--white-dim)', opacity: 0.4, padding: '1rem', textAlign: 'center' }}>참가자 없음</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <select value={addPlayerId} onChange={e => setAddPlayerId(e.target.value)} style={{ ...inp, flex: 1 }}>
                <option value="">플레이어 추가...</option>
                {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.nickname} @{p.username}</option>)}
              </select>
              <button onClick={addParticipant} disabled={!addPlayerId || isPending} style={btnGold}>추가</button>
            </div>
            {league.participants.length >= league.players_per_game && (
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold-dim)', marginTop: '0.8rem', opacity: 0.7 }}>
                참가자 등록 완료 후 &apos;경기 일정&apos; 탭에서 일정을 생성하세요
              </p>
            )}
          </>
        )}

        {/* Schedule Tab */}
        {tab === 'schedule' && (
          <ScheduleManager
            league={league}
            hasSchedule={hasSchedule}
            totalRounds={totalRounds}
            isPending={isPending}
            onGenerate={generateSchedule}
            onReset={resetSchedule}
            onResultSaved={(matchId, results) => {
              const K = results.length;
              updateLeague(league.id, {
                schedule: league.schedule.map(m => {
                  if (m.id !== matchId) return m;
                  return {
                    ...m,
                    status: 'completed',
                    matchPlayers: m.matchPlayers.map(mp => {
                      const r = results.find(x => x.player_id === mp.player_id);
                      if (!r) return mp;
                      return { ...mp, rank: r.rank, score: r.score ?? null, points_earned: K - r.rank + 1 };
                    }),
                  };
                }),
                // Update participant scores (will be refreshed from DB on reload, this is optimistic)
                participants: (() => {
                  const delta: Record<string, number> = {};
                  results.forEach(r => { delta[r.player_id] = K - r.rank + 1; });
                  return league.participants.map(p => ({
                    ...p,
                    score: p.score + (delta[p.player_id] ?? 0),
                  }));
                })(),
              });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.8rem', color: 'var(--foreground)', lineHeight: 1 }}>리그 관리</h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>LEAGUE MANAGEMENT</p>
        </div>
        <button onClick={() => setShowNew(v => !v)} style={btnGold}>{showNew ? '취소' : '+ 새 리그'}</button>
      </div>

      {showNew && <CreateForm />}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {leagues.length === 0 && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--white-dim)', opacity: 0.4, padding: '1rem' }}>리그 없음</p>}
          {leagues.map(l => (
            <button key={l.id} onClick={() => setSelected(selected === l.id ? null : l.id)} style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem',
              padding: '0.8rem 1rem', cursor: 'pointer', textAlign: 'left',
              border: `1px solid ${selected === l.id ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}`,
              background: selected === l.id ? 'rgba(201,168,76,0.08)' : 'rgba(30,74,52,0.1)',
              color: 'var(--foreground)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {l.is_active && <span style={{ fontSize: '0.5rem', color: 'var(--gold)' }}>●</span>}
                {l.name}
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5 }}>
                {l.participants.length}명 · {l.players_per_game}인
              </span>
            </button>
          ))}
        </div>
        <div>
          {selectedLeague ? <LeagueDetail league={selectedLeague} /> : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', opacity: 0.4, border: '1px dashed rgba(201,168,76,0.15)' }}>
              왼쪽에서 리그를 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── */
/* Schedule Manager                */
/* ─────────────────────────────── */
function ScheduleManager({ league, hasSchedule, totalRounds, isPending, onGenerate, onReset, onResultSaved }: {
  league: { id: string; participants: { player_id: string; player: { nickname: string } }[]; players_per_game: number; schedule: ScheduleMatch[] };
  hasSchedule: boolean; totalRounds: number; isPending: boolean;
  onGenerate: () => void; onReset: () => void;
  onResultSaved: (matchId: string, results: { player_id: string; rank: number; score?: number }[]) => void;
}) {
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const K = league.players_per_game;
  const participantSet = new Set(league.participants.map(p => p.player_id));

  const openRecording = (match: ScheduleMatch) => {
    setRecordingId(match.id);
    const initRanks: Record<string, string> = {};
    const initScores: Record<string, string> = {};
    match.matchPlayers.forEach(mp => {
      initRanks[mp.player_id] = mp.rank ? String(mp.rank) : '';
      initScores[mp.player_id] = mp.score !== null ? String(mp.score) : '';
    });
    setRanks(initRanks);
    setScores(initScores);
  };

  const saveResult = async (match: ScheduleMatch) => {
    const results = match.matchPlayers.map(mp => ({
      player_id: mp.player_id,
      rank: parseInt(ranks[mp.player_id] ?? '') || 0,
      score: scores[mp.player_id] ? parseInt(scores[mp.player_id]) : undefined,
    }));

    if (results.some(r => !r.rank || r.rank < 1 || r.rank > K)) {
      alert(`모든 참가자의 순위를 1~${K} 사이로 입력해주세요`);
      return;
    }
    const rankSet = new Set(results.map(r => r.rank));
    if (rankSet.size !== results.length) {
      alert('순위가 중복됩니다');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/admin/leagues', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: league.id, action: 'record_match_result', match_id: match.id, results }),
    });
    setSaving(false);
    if (!res.ok) { alert((await res.json()).error); return; }
    onResultSaved(match.id, results);
    setRecordingId(null);
  };

  if (!hasSchedule) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.6, marginBottom: '0.5rem' }}>
          일정이 없습니다.
        </p>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold-dim)', opacity: 0.7, marginBottom: '1.5rem' }}>
          참가자 {league.participants.length}명 · {K}인 게임 기준으로 균등 배분 일정이 생성됩니다
        </p>
        <button onClick={onGenerate} disabled={isPending || league.participants.length < K} style={{ ...btnGold, padding: '0.7rem 2rem', fontSize: '0.7rem' }}>
          {isPending ? '생성 중...' : '일정 자동 생성'}
        </button>
        {league.participants.length < K && (
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: '#ff8888', marginTop: '0.8rem' }}>
            {K}인 게임을 위해 최소 {K}명의 참가자가 필요합니다 (현재 {league.participants.length}명)
          </p>
        )}
      </div>
    );
  }

  // Group matches by round
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--gold-dim)' }}>
            {league.participants.length}명 · {K}인 게임 · {totalRounds}라운드
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5, marginTop: '0.2rem' }}>
            승점 배분: 1위={K}승점, 2위={K-1}승점 ... {K}위=1승점
          </p>
        </div>
        <button onClick={onReset} disabled={isPending} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.3rem 0.7rem', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888', background: 'transparent', cursor: 'pointer' }}>
          일정 초기화
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {rounds.map(round => {
          const matches = league.schedule.filter(m => m.round === round);
          const allPlayerIdsThisRound = new Set(matches.flatMap(m => m.matchPlayers.map(mp => mp.player_id)));
          const sittingOut = [...participantSet].filter(pid => !allPlayerIdsThisRound.has(pid));

          return (
            <div key={round}>
              {/* Round header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)', minWidth: 64 }}>
                  R{round}
                </span>
                {sittingOut.length > 0 && (
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.82rem', color: 'var(--white-dim)', opacity: 0.4, fontStyle: 'italic' }}>
                    대기: {sittingOut.map(pid => league.participants.find(p => p.player_id === pid)?.player.nickname ?? '?').join(', ')}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {matches.map((match, mi) => {
                  const isRecording = recordingId === match.id;
                  const isDone = match.status === 'completed';
                  const canRecord = !isDone;

                  return (
                    <div key={match.id} style={{
                      border: `1px solid ${isDone ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.12)'}`,
                      background: isDone ? 'rgba(201,168,76,0.05)' : 'rgba(30,74,52,0.2)',
                      minWidth: 160, flex: '0 0 auto',
                    }}>
                      {/* Match header */}
                      <div style={{ padding: '0.3rem 0.7rem', borderBottom: '1px solid rgba(201,168,76,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.1em', color: 'var(--gold-dim)' }}>
                          경기 {mi + 1}
                        </span>
                        {isDone && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: '#4ade80' }}>완료</span>}
                      </div>

                      {/* Players */}
                      {isRecording ? (
                        <div style={{ padding: '0.5rem' }}>
                          {match.matchPlayers.map(mp => (
                            <div key={mp.player_id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', color: 'var(--foreground)', flex: 1, minWidth: 60, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {mp.player.nickname}
                              </span>
                              <select
                                value={ranks[mp.player_id] ?? ''}
                                onChange={e => setRanks(prev => ({ ...prev, [mp.player_id]: e.target.value }))}
                                style={{ ...inp, padding: '0.15rem 0.25rem', fontSize: '0.72rem', width: 48 }}
                              >
                                <option value="">순위</option>
                                {Array.from({ length: K }, (_, i) => i + 1).map(r => (
                                  <option key={r} value={r}>{r}위</option>
                                ))}
                              </select>
                              <input
                                value={scores[mp.player_id] ?? ''}
                                onChange={e => setScores(prev => ({ ...prev, [mp.player_id]: e.target.value }))}
                                placeholder="점수"
                                style={{ ...inp, padding: '0.15rem 0.25rem', fontSize: '0.72rem', width: 44 }}
                              />
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                            <button onClick={() => setRecordingId(null)} style={{ ...btn, flex: 1, padding: '0.25rem', fontSize: '0.52rem' }}>취소</button>
                            <button onClick={() => saveResult(match)} disabled={saving} style={{ ...btnGold, flex: 1, padding: '0.25rem', fontSize: '0.52rem' }}>
                              {saving ? '...' : '저장'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {match.matchPlayers
                            .slice()
                            .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                            .map((mp, pi) => (
                              <div key={mp.player_id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.4rem 0.7rem',
                                borderTop: pi > 0 ? '1px solid rgba(201,168,76,0.06)' : 'none',
                                background: isDone && mp.rank === 1 ? 'rgba(201,168,76,0.08)' : 'transparent',
                              }}>
                                {isDone && mp.rank && (
                                  <span style={{
                                    fontFamily: "'Cinzel', serif", fontSize: '0.7rem',
                                    color: mp.rank === 1 ? '#c9a84c' : mp.rank === 2 ? '#c8c8c8' : mp.rank === 3 ? '#a0732a' : 'rgba(244,239,230,0.3)',
                                    minWidth: 20, fontWeight: 700,
                                  }}>
                                    {mp.rank}
                                  </span>
                                )}
                                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: isDone && mp.rank === 1 ? 'var(--gold)' : 'var(--foreground)', flex: 1 }}>
                                  {mp.player.nickname}
                                </span>
                                {isDone && (
                                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--gold)', opacity: 0.8 }}>
                                    +{mp.points_earned}승점
                                  </span>
                                )}
                                {!isDone && mp.score !== null && (
                                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--white-dim)', opacity: 0.5 }}>
                                    {mp.score}
                                  </span>
                                )}
                              </div>
                            ))}
                          {canRecord && (
                            <button onClick={() => openRecording(match)} style={{ width: '100%', padding: '0.3rem', fontFamily: "'Cinzel', serif", fontSize: '0.5rem', background: 'transparent', border: 'none', borderTop: '1px solid rgba(201,168,76,0.08)', color: 'var(--gold-dim)', cursor: 'pointer' }}>
                              결과 입력
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', padding: '0.5rem 0.7rem', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', outline: 'none' };
const btn: React.CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.4rem 0.8rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer' };
const btnGold: React.CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em', padding: '0.4rem 1rem', border: 'none', background: 'var(--gold)', color: '#0b2218', cursor: 'pointer', fontWeight: 600 };

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
      {children}
    </div>
  );
}
