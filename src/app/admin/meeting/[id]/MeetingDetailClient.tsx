'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BoardlifeGamePicker, { type PickedGame } from '@/components/BoardlifeGamePicker';
import LapisIcon from '@/components/LapisIcon';

interface Player { id: string; nickname: string; username: string; }
interface Attendance { player_id: string; status: 'attended' | 'late' | 'absent'; voted: boolean; }
interface Participant { player_id: string; player: Player; team?: string | null; rank?: number | null; role?: string | null; is_winner?: boolean | null; is_mvp?: boolean; chip_change: number; }
interface Match { id: string; game_type: string; played_at: string; note: string | null; participants: Participant[]; }
interface Meeting { id: string; number: number; held_at: string; status: string; note: string | null; }

const GAME_TYPES = [
  { value: 'ranking', label: '순위전', color: '#c9a84c' },
  { value: 'mafia',   label: '마피아', color: '#e879f9' },
  { value: 'team',    label: '팀전',   color: '#60a5fa' },
  { value: 'coop',    label: '협력',   color: '#34d399' },
  { value: 'onevsmany', label: '1vs多', color: '#fb923c' },
  { value: 'deathmatch', label: '데스매치', color: '#f87171' },
];

const STATUS_COLOR: Record<string, string> = { upcoming: 'var(--gold)', active: '#4ade80', closed: 'var(--white-dim)' };
const ATT_COLOR: Record<string, string> = { attended: '#4ade80', late: '#c9a84c', absent: '#f87171' };
const ATT_LABEL: Record<string, string> = { attended: '출석', late: '지각', absent: '불참' };

const s = {
  label: { fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--white-dim)', display: 'block', marginBottom: '0.3rem' } as React.CSSProperties,
  input: { width: '100%', background: 'rgba(11,34,24,0.8)', border: '1px solid var(--gold-dim)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', padding: '0.6rem 1rem', outline: 'none' } as React.CSSProperties,
  card: { background: 'rgba(30,74,52,0.12)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem' } as React.CSSProperties,
  section: { fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.25em', color: 'var(--gold)', marginBottom: '1rem' } as React.CSSProperties,
};

export default function MeetingDetailClient({
  meeting, players, attendances, matches, activeQuarterId, activeQuarterName,
}: {
  meeting: Meeting;
  players: Player[];
  attendances: Attendance[];
  matches: Match[];
  activeQuarterId: string | null;
  activeQuarterName: string | null;
}) {
  const router = useRouter();
  const [, startT] = useTransition();
  const [tab, setTab] = useState<'attendance' | 'record'>('attendance');

  // ── 출석 상태 ──────────────────────────────────────────────
  const [attMap, setAttMap] = useState<Record<string, { status: 'attended' | 'late' | 'absent'; voted: boolean }>>(() => {
    const m: Record<string, { status: 'attended' | 'late' | 'absent'; voted: boolean }> = {};
    attendances.forEach(a => { m[a.player_id] = { status: a.status, voted: a.voted }; });
    return m;
  });
  const [attSaving, setAttSaving] = useState(false);
  const [attMsg, setAttMsg] = useState('');

  async function saveAttendance() {
    setAttSaving(true);
    setAttMsg('');
    const list = Object.entries(attMap).map(([player_id, v]) => ({ player_id, ...v }));
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_attendance', meeting_id: meeting.id, attendances: list, quarter_id: activeQuarterId }),
    });
    setAttSaving(false);
    setAttMsg(res.ok ? '✓ 저장됨' : '오류 발생');
    if (res.ok) startT(() => router.refresh());
  }

  // ── 경기 기록 ──────────────────────────────────────────────
  const [gameType, setGameType] = useState('ranking');
  const [gameName, setGameName] = useState('');
  const [boardlifeGame, setBoardlifeGame] = useState<PickedGame | null>(null);
  const [selPlayers, setSelPlayers] = useState<string[]>([]);
  const [rankMap, setRankMap] = useState<Record<string, number>>({});
  const [teamMap, setTeamMap] = useState<Record<string, string>>({});
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [winMap, setWinMap] = useState<Record<string, boolean>>({});
  const [mvpId, setMvpId] = useState('');
  const [recSaving, setRecSaving] = useState(false);
  const [recMsg, setRecMsg] = useState('');
  const [localMatches, setLocalMatches] = useState<Match[]>(matches);

  function togglePlayer(pid: string) {
    setSelPlayers(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  }

  async function recordMatch() {
    if (selPlayers.length < 2) { setRecMsg('최소 2명 이상 선택하세요'); return; }
    setRecSaving(true);
    setRecMsg('');

    const participants = selPlayers.map(pid => ({
      player_id: pid,
      team: teamMap[pid] ?? null,
      rank: rankMap[pid] ?? null,
      role: roleMap[pid] ?? null,
      is_winner: winMap[pid] ?? null,
      is_mvp: mvpId === pid,
    }));

    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'record_match', meeting_id: meeting.id, game_type: gameType, game_name: boardlifeGame?.name || gameName, boardlife_game_id: boardlifeGame?.boardlife_id ?? null, boardlife_game_name: boardlifeGame?.name ?? null, participants, quarter_id: activeQuarterId }),
    });
    setRecSaving(false);
    if (res.ok) {
      setRecMsg('✓ 경기 기록됨');
      setSelPlayers([]); setRankMap({}); setTeamMap({}); setRoleMap({}); setWinMap({}); setMvpId(''); setGameName(''); setBoardlifeGame(null);
      startT(() => router.refresh());
    } else {
      const d = await res.json();
      setRecMsg(d.error ?? '오류 발생');
    }
  }

  async function deleteMatch(match_id: string) {
    if (!confirm('경기 기록과 LAPIS를 모두 삭제합니다. 계속할까요?')) return;
    await fetch('/api/admin/meeting', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_match', meeting_id: meeting.id, match_id }),
    });
    setLocalMatches(prev => prev.filter(m => m.id !== match_id));
  }

  const attendedPlayers = players.filter(p => attMap[p.id]?.status === 'attended' || attMap[p.id]?.status === 'late');

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <Link href="/admin/meeting" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)', textDecoration: 'none', letterSpacing: '0.12em' }}>← 모임 목록</Link>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.8rem', color: 'var(--foreground)', marginTop: '0.5rem' }}>
            제{meeting.number}회 모임
          </h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>
              {new Date(meeting.held_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: STATUS_COLOR[meeting.status], border: `1px solid ${STATUS_COLOR[meeting.status]}`, padding: '0.1rem 0.5rem' }}>
              {meeting.status === 'upcoming' ? '예정' : meeting.status === 'active' ? '진행중' : '종료'}
            </span>
            {activeQuarterName && (
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold-dim)', border: '1px solid var(--gold-dim)', padding: '0.1rem 0.5rem' }}>
                {activeQuarterName}
              </span>
            )}
          </div>
          {meeting.note && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.4rem' }}>{meeting.note}</p>}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(201,168,76,0.12)', marginBottom: '2rem' }}>
        {(['attendance', 'record'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
            padding: '0.7rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t ? 'var(--gold)' : 'var(--white-dim)',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
          }}>
            {t === 'attendance' ? '출석 관리' : '경기 기록'}
          </button>
        ))}
      </div>

      {/* ── 출석 관리 ── */}
      {tab === 'attendance' && (
        <div>
          <p style={s.section}>플레이어 출석 현황 ({Object.values(attMap).filter(a => a.status === 'attended').length}명 출석)</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '1.5rem' }}>
            {players.map(p => {
              const att = attMap[p.id];
              const status = att?.status ?? null;
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1rem', background: 'rgba(30,74,52,0.1)', borderLeft: `2px solid ${status ? ATT_COLOR[status] : 'rgba(201,168,76,0.1)'}` }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', flex: 1 }}>
                    {p.nickname} <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5 }}>@{p.username}</span>
                  </span>
                  {/* 상태 버튼 */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {(['attended', 'late', 'absent'] as const).map(st => (
                      <button key={st} onClick={() => setAttMap(prev => ({ ...prev, [p.id]: { status: st, voted: prev[p.id]?.voted ?? true } }))}
                        style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.25rem 0.6rem', background: status === st ? `${ATT_COLOR[st]}20` : 'none', border: `1px solid ${status === st ? ATT_COLOR[st] : 'rgba(201,168,76,0.15)'}`, color: status === st ? ATT_COLOR[st] : 'var(--white-dim)', cursor: 'pointer' }}>
                        {ATT_LABEL[st]}
                      </button>
                    ))}
                    {/* 미기록 */}
                    <button onClick={() => setAttMap(prev => { const n = { ...prev }; delete n[p.id]; return n; })}
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.25rem 0.6rem', background: !status ? 'rgba(201,168,76,0.08)' : 'none', border: `1px solid ${!status ? 'var(--gold-dim)' : 'rgba(201,168,76,0.1)'}`, color: !status ? 'var(--gold-dim)' : 'rgba(244,239,230,0.2)', cursor: 'pointer' }}>
                      미기록
                    </button>
                  </div>
                  {/* 투표 여부 (출석/지각일 때) */}
                  {status && status !== 'absent' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)' }}>
                      <input type="checkbox" checked={att?.voted ?? true}
                        onChange={e => setAttMap(prev => ({ ...prev, [p.id]: { ...prev[p.id], voted: e.target.checked } }))}
                        style={{ accentColor: 'var(--gold)' }} />
                      투표참여
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={saveAttendance} disabled={attSaving} className="btn-gold">
              {attSaving ? '저장 중...' : '출석 저장'}
            </button>
            {attMsg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: attMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{attMsg}</span>}
            {!activeQuarterId && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#fb923c', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>⚠ 활성 분기 없음 — <LapisIcon size={11} /> LAPIS가 분기에 귀속되지 않습니다</span>}
          </div>
        </div>
      )}

      {/* ── 경기 기록 ── */}
      {tab === 'record' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

          {/* 신규 경기 기록 폼 */}
          <div style={s.card}>
            <p style={s.section}>새 경기 기록</p>

            {/* 게임 타입 */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={s.label}>게임 유형</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {GAME_TYPES.map(gt => (
                  <button key={gt.value} onClick={() => { setGameType(gt.value); setSelPlayers([]); setRankMap({}); setTeamMap({}); setRoleMap({}); setWinMap({}); setMvpId(''); }}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', padding: '0.3rem 0.8rem', background: gameType === gt.value ? `${gt.color}20` : 'none', border: `1px solid ${gameType === gt.value ? gt.color : 'rgba(201,168,76,0.2)'}`, color: gameType === gt.value ? gt.color : 'var(--white-dim)', cursor: 'pointer' }}>
                    {gt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 게임 이름 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>보드게임 선택</label>
              <BoardlifeGamePicker value={boardlifeGame} onChange={g => { setBoardlifeGame(g); setGameName(g?.name ?? ''); }} placeholder="게임 검색 (예: 카탄, 브라스...)" />
              {!boardlifeGame && (
                <input style={{ ...s.input, marginTop: '0.4rem' }} placeholder="또는 이름 직접 입력 (비공식 게임 등)" value={gameName} onChange={e => setGameName(e.target.value)} />
              )}
            </div>

            {/* 플레이어 선택 */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={s.label}>참여 플레이어 선택 (출석/지각 기준)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
                {(attendedPlayers.length > 0 ? attendedPlayers : players).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.4rem 0.8rem', background: selPlayers.includes(p.id) ? 'rgba(201,168,76,0.08)' : 'none', cursor: 'pointer', border: `1px solid ${selPlayers.includes(p.id) ? 'rgba(201,168,76,0.3)' : 'transparent'}` }}
                    onClick={() => togglePlayer(p.id)}>
                    <span style={{ width: 12, height: 12, border: `1px solid ${selPlayers.includes(p.id) ? 'var(--gold)' : 'var(--gold-dim)'}`, background: selPlayers.includes(p.id) ? 'var(--gold)' : 'none', flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)' }}>{p.nickname}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 게임 타입별 설정 */}
            {selPlayers.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={s.label}>결과 설정</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selPlayers.map(pid => {
                    const player = players.find(p => p.id === pid);
                    return (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.6rem', background: 'rgba(11,34,24,0.5)' }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--foreground)', minWidth: 80 }}>{player?.nickname}</span>

                        {/* 순위전: 순위 입력 */}
                        {gameType === 'ranking' && (
                          <input type="number" min={1} max={selPlayers.length} placeholder="순위"
                            value={rankMap[pid] ?? ''}
                            onChange={e => setRankMap(prev => ({ ...prev, [pid]: parseInt(e.target.value) }))}
                            style={{ ...s.input, width: 60, padding: '0.3rem 0.5rem', fontSize: '0.9rem' }} />
                        )}

                        {/* 마피아: 역할 + 승패 */}
                        {gameType === 'mafia' && (
                          <>
                            <select value={roleMap[pid] ?? ''} onChange={e => setRoleMap(prev => ({ ...prev, [pid]: e.target.value }))}
                              style={{ ...s.input, width: 90, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}>
                              <option value="">역할</option>
                              <option value="mafia">마피아</option>
                              <option value="citizen">시민</option>
                              <option value="special">특수</option>
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#4ade80', cursor: 'pointer' }}>
                              <input type="checkbox" checked={winMap[pid] ?? false} onChange={e => setWinMap(prev => ({ ...prev, [pid]: e.target.checked }))} style={{ accentColor: '#4ade80' }} /> 승
                            </label>
                          </>
                        )}

                        {/* 팀전: 팀 + 승패 */}
                        {gameType === 'team' && (
                          <>
                            <select value={teamMap[pid] ?? ''} onChange={e => setTeamMap(prev => ({ ...prev, [pid]: e.target.value }))}
                              style={{ ...s.input, width: 70, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}>
                              <option value="">팀</option>
                              <option value="A">A팀</option>
                              <option value="B">B팀</option>
                              <option value="C">C팀</option>
                              <option value="D">D팀</option>
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#4ade80', cursor: 'pointer' }}>
                              <input type="checkbox" checked={winMap[pid] ?? false} onChange={e => setWinMap(prev => ({ ...prev, [pid]: e.target.checked }))} style={{ accentColor: '#4ade80' }} /> 승
                            </label>
                          </>
                        )}

                        {/* 협력: 승패 + MVP */}
                        {gameType === 'coop' && (
                          <>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#4ade80', cursor: 'pointer' }}>
                              <input type="checkbox" checked={winMap[pid] ?? false} onChange={e => setWinMap(prev => ({ ...prev, [pid]: e.target.checked }))} style={{ accentColor: '#4ade80' }} /> 성공
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold)', cursor: 'pointer' }}>
                              <input type="radio" name="mvp" checked={mvpId === pid} onChange={() => setMvpId(pid)} style={{ accentColor: 'var(--gold)' }} /> MVP
                            </label>
                          </>
                        )}

                        {/* 1vs다수: 역할(solo/group) + 승패 */}
                        {gameType === 'onevsmany' && (
                          <>
                            <select value={teamMap[pid] ?? ''} onChange={e => setTeamMap(prev => ({ ...prev, [pid]: e.target.value }))}
                              style={{ ...s.input, width: 80, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}>
                              <option value="">포지션</option>
                              <option value="solo">솔로</option>
                              <option value="group">그룹</option>
                            </select>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#4ade80', cursor: 'pointer' }}>
                              <input type="checkbox" checked={winMap[pid] ?? false} onChange={e => setWinMap(prev => ({ ...prev, [pid]: e.target.checked }))} style={{ accentColor: '#4ade80' }} /> 승
                            </label>
                          </>
                        )}

                        {/* 데스매치: 승패 */}
                        {gameType === 'deathmatch' && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#4ade80', cursor: 'pointer' }}>
                            <input type="checkbox" checked={winMap[pid] ?? false} onChange={e => setWinMap(prev => ({ ...prev, [pid]: e.target.checked }))} style={{ accentColor: '#4ade80' }} /> 승
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={recordMatch} disabled={recSaving} className="btn-gold">
                {recSaving ? '기록 중...' : '경기 기록'}
              </button>
              {recMsg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: recMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{recMsg}</span>}
            </div>
          </div>

          {/* 기록된 경기 목록 */}
          <div>
            <p style={s.section}>경기 기록 ({localMatches.length}경기)</p>
            {localMatches.length === 0 ? (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.4 }}>아직 기록된 경기가 없습니다</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {localMatches.map(m => {
                  const gt = GAME_TYPES.find(g => g.value === m.game_type);
                  return (
                    <div key={m.id} style={{ ...s.card, padding: '1rem', borderLeft: `2px solid ${gt?.color ?? 'var(--gold-dim)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: gt?.color ?? 'var(--gold)' }}>{gt?.label ?? m.game_type}</span>
                        <button onClick={() => deleteMatch(m.id)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {m.participants.map(mp => (
                          <span key={mp.player_id} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', padding: '0.15rem 0.5rem', background: (mp.is_winner || (m.game_type === 'ranking' && mp.rank === 1)) ? 'rgba(74,222,128,0.1)' : 'rgba(244,239,230,0.04)', border: `1px solid ${(mp.is_winner || (m.game_type === 'ranking' && mp.rank === 1)) ? 'rgba(74,222,128,0.3)' : 'rgba(244,239,230,0.08)'}`, color: 'var(--foreground)' }}>
                            {mp.player.nickname}
                            {m.game_type === 'ranking' && mp.rank && <span style={{ fontSize: '0.7rem', color: 'var(--gold-dim)', marginLeft: 3 }}>#{mp.rank}</span>}
                            {mp.is_mvp && <span style={{ fontSize: '0.7rem', color: 'var(--gold)', marginLeft: 3 }}>★MVP</span>}
                            <span style={{ fontSize: '0.7rem', color: mp.chip_change > 0 ? '#4ade80' : mp.chip_change < 0 ? '#f87171' : 'var(--white-dim)', marginLeft: 3 }}>
                              {mp.chip_change > 0 ? `+${mp.chip_change}` : mp.chip_change}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
