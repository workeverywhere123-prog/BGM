'use client';

import { useState, useTransition } from 'react';
import { calcChips } from '@/domain/chip';
import { recordMatchAction, ensureMeetingAction } from './actions';
import type { GameType, MafiaRole, ParticipantInput } from '@/types/domain';

interface Player { id: string; nickname: string; username: string }
interface Meeting { id: string; number: number; held_at: string }
interface RecordFormProps { players: Player[]; meetings: Meeting[]; leagueId: string }

const GAME_TYPE_LABELS: Record<GameType, string> = {
  team: '팀전', mafia: '마피아', deathmatch: '데스매치',
  onevsmany: '1vs多', coop: '협력', ranking: '순위게임',
};
const GAME_TYPE_DESC: Record<GameType, string> = {
  team: '승 +1 / 패 -1',
  mafia: '마피아승 +2 · 시민승 +1 · 특수+3 / 패 0',
  deathmatch: '인당 N칩 베팅 → 승자독식',
  onevsmany: '1인승 +2 · 다인승 +1 / 패 -1',
  coop: 'MVP 득표자 +1',
  ranking: '순위별 차등 칩',
};

type RowState = {
  player_id: string; team: string; rank: string;
  role: string; is_winner: boolean | null; is_mvp: boolean;
};

function emptyRow(player_id = ''): RowState {
  return { player_id, team: '', rank: '', role: '', is_winner: null, is_mvp: false };
}

// ── 공통 스타일 토큰 ──────────────────────────────────────────────────────
const S = {
  section: {
    padding: '1.5rem',
    background: 'rgba(30,74,52,0.12)',
    border: '1px solid rgba(201,168,76,0.12)',
    marginBottom: '1rem',
  } as React.CSSProperties,
  sectionLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.55rem',
    letterSpacing: '0.22em',
    color: 'var(--gold-dim)',
    marginBottom: '0.85rem',
  } as React.CSSProperties,
  input: {
    width: '100%', padding: '0.55rem 0.85rem', boxSizing: 'border-box' as const,
    background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(201,168,76,0.2)',
    color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
    fontSize: '0.95rem', outline: 'none',
  } as React.CSSProperties,
  select: {
    padding: '0.55rem 0.85rem', boxSizing: 'border-box' as const,
    background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(201,168,76,0.2)',
    color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
    fontSize: '0.95rem', outline: 'none',
  } as React.CSSProperties,
};

// 타입 버튼 색상
const TYPE_COLOR: Partial<Record<GameType, string>> = {
  team: '#4ade80', mafia: '#f87171', deathmatch: '#fb923c',
  onevsmany: '#60a5fa', coop: '#e879f9', ranking: 'var(--gold)',
};

export function RecordForm({ players, meetings, leagueId }: RecordFormProps) {
  const [gameType, setGameType] = useState<GameType>('team');
  const [meetingId, setMeetingId] = useState<string>(meetings[0]?.id ?? '');
  const [newMeetingNumber, setNewMeetingNumber] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<RowState[]>([emptyRow(), emptyRow()]);
  const [bet, setBet] = useState(3);
  const [note, setNote] = useState('');
  const [boardGameName, setBoardGameName] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const toParticipantInputs = (): ParticipantInput[] =>
    rows.filter(r => r.player_id).map(r => ({
      player_id: r.player_id,
      team: r.team || undefined,
      rank: r.rank ? parseInt(r.rank) : undefined,
      role: (r.role as MafiaRole) || undefined,
      is_winner: r.is_winner ?? undefined,
      is_mvp: r.is_mvp,
    }));

  const previewChips = () => {
    try {
      const inputs = toParticipantInputs();
      if (inputs.length < 2) return [];
      return calcChips(gameType, inputs, { deathmatch_bet: bet });
    } catch { return []; }
  };

  const updateRow = (i: number, patch: Partial<RowState>) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const setWinnerTeam = (winTeam: string) =>
    setRows(prev => prev.map(r => ({
      ...r, is_winner: r.team === winTeam ? true : r.team ? false : null,
    })));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle'); setErrorMsg('');
    const participants = toParticipantInputs();
    if (participants.length < 2) {
      setErrorMsg('참여자를 2명 이상 입력해주세요'); setStatus('error'); return;
    }
    startTransition(async () => {
      let resolvedMeetingId = meetingId;
      if (!meetingId && newMeetingNumber) {
        const res = await ensureMeetingAction(leagueId, parseInt(newMeetingNumber), new Date(newMeetingDate).toISOString());
        if (!res.ok) { setErrorMsg(res.error.message); setStatus('error'); return; }
        resolvedMeetingId = res.data.meeting_id;
      }
      if (!resolvedMeetingId) {
        setErrorMsg('모임을 선택하거나 새 모임을 입력해주세요'); setStatus('error'); return;
      }
      const res = await recordMatchAction({
        meeting_id: resolvedMeetingId, game_type: gameType,
        note: note || undefined, participants, deathmatch_bet: bet,
        boardlife_game_name: boardGameName.trim() || undefined,
      });
      if (res.ok) {
        setStatus('success');
        setRows([emptyRow(), emptyRow()]);
        setNote(''); setBoardGameName('');
      } else { setErrorMsg(res.error.message); setStatus('error'); }
    });
  };

  const preview = previewChips();
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));
  const accentColor = TYPE_COLOR[gameType] ?? 'var(--gold)';

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── 모임 회차 ─────────────────────────────────────────────── */}
      <div style={S.section}>
        <p style={S.sectionLabel}>모임 회차</p>
        {meetings.length > 0 && (
          <select value={meetingId} onChange={e => setMeetingId(e.target.value)}
            style={{ ...S.select, width: '100%' }}>
            <option value="">— 새 모임 입력 —</option>
            {meetings.map(m => (
              <option key={m.id} value={m.id}>
                제{m.number}회 ({m.held_at.slice(0, 10)})
              </option>
            ))}
          </select>
        )}
        {!meetingId && (
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: meetings.length > 0 ? '0.6rem' : 0 }}>
            <input type="number" placeholder="회차 번호 (예: 42)"
              value={newMeetingNumber} onChange={e => setNewMeetingNumber(e.target.value)}
              style={{ ...S.input, width: 160 }} />
            <input type="date" value={newMeetingDate} onChange={e => setNewMeetingDate(e.target.value)}
              style={{ ...S.input, flex: 1 }} />
          </div>
        )}
      </div>

      {/* ── 게임 타입 ─────────────────────────────────────────────── */}
      <div style={S.section}>
        <p style={S.sectionLabel}>게임 타입</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
          {(Object.keys(GAME_TYPE_LABELS) as GameType[]).map(t => {
            const color = TYPE_COLOR[t] ?? 'var(--gold)';
            const active = gameType === t;
            return (
              <button key={t} type="button"
                onClick={() => { setGameType(t); setRows(rows.map(r => emptyRow(r.player_id))); }}
                style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.06em',
                  padding: '0.6rem 0', cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${active ? color : 'rgba(201,168,76,0.2)'}`,
                  background: active ? `${color}22` : 'transparent',
                  color: active ? color : 'var(--white-dim)',
                  fontWeight: active ? 600 : 400,
                }}>
                {GAME_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5, marginTop: '0.6rem', letterSpacing: '0.05em' }}>
          {GAME_TYPE_DESC[gameType]}
        </p>
      </div>

      {/* ── 데스매치 베팅 ─────────────────────────────────────────── */}
      {gameType === 'deathmatch' && (
        <div style={S.section}>
          <p style={S.sectionLabel}>인당 베팅 칩</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {[1, 2, 3, 5].map(n => (
              <button key={n} type="button" onClick={() => setBet(n)}
                style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.65rem', padding: '0.5rem 1rem',
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${bet === n ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
                  background: bet === n ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: bet === n ? 'var(--gold)' : 'var(--white-dim)',
                }}>
                {n}칩
              </button>
            ))}
            <input type="number" min={1} value={bet} onChange={e => setBet(parseInt(e.target.value) || 3)}
              style={{ ...S.input, width: 80 }} />
          </div>
        </div>
      )}

      {/* ── 참여자 ───────────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <p style={{ ...S.sectionLabel, marginBottom: 0 }}>참여자</p>
          <button type="button" onClick={addRow}
            style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
            + 추가
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {rows.map((row, i) => (
            <ParticipantRow key={i} row={row} gameType={gameType} players={players}
              usedIds={rows.map(r => r.player_id).filter(id => id && id !== row.player_id)}
              onChange={patch => updateRow(i, patch)}
              onRemove={rows.length > 2 ? () => removeRow(i) : undefined}
            />
          ))}
        </div>

        {/* 팀 승리 설정 */}
        {(gameType === 'team' || gameType === 'onevsmany') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.85rem' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5 }}>승리팀:</span>
            {['A', 'B'].map(t => (
              <button key={t} type="button" onClick={() => setWinnerTeam(t)}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em', padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid rgba(201,168,76,0.25)', background: 'transparent', color: 'var(--white-dim)' }}>
                {t}팀 승리
              </button>
            ))}
            {gameType === 'onevsmany' && (
              <button type="button" onClick={() => setWinnerTeam('solo')}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em', padding: '0.35rem 0.9rem', cursor: 'pointer', border: '1px solid rgba(201,168,76,0.25)', background: 'transparent', color: 'var(--white-dim)' }}>
                1인팀 승리
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 칩 변동 미리보기 ─────────────────────────────────────── */}
      {preview.length > 0 && (
        <div style={{ ...S.section, borderLeft: `2px solid ${accentColor}` }}>
          <p style={{ ...S.sectionLabel, color: accentColor }}>칩 변동 미리보기</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {preview.map(r => {
              const p = playerMap[r.player_id];
              if (!p) return null;
              const plus = r.chip_change > 0;
              const minus = r.chip_change < 0;
              return (
                <div key={r.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', opacity: 0.85 }}>
                    {p.nickname}
                  </span>
                  <span style={{
                    fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 600,
                    color: plus ? '#4ade80' : minus ? '#f87171' : 'var(--white-dim)',
                    opacity: (!plus && !minus) ? 0.4 : 1,
                  }}>
                    {plus ? '+' : ''}{r.chip_change}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 보드게임 이름 ─────────────────────────────────────────── */}
      <div style={S.section}>
        <p style={S.sectionLabel}>
          보드게임 이름&nbsp;
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', opacity: 0.5, letterSpacing: '0.05em' }}>(선택)</span>
        </p>
        <input type="text" placeholder="예: 아발론, 브라스: 버밍엄, 루트"
          value={boardGameName} onChange={e => setBoardGameName(e.target.value)}
          style={S.input} />
      </div>

      {/* ── 메모 ─────────────────────────────────────────────────── */}
      <div style={S.section}>
        <p style={S.sectionLabel}>
          메모&nbsp;
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', opacity: 0.5, letterSpacing: '0.05em' }}>(선택)</span>
        </p>
        <input type="text" placeholder="특이사항, 분위기 등"
          value={note} onChange={e => setNote(e.target.value)}
          style={S.input} />
      </div>

      {/* ── 에러 / 성공 ──────────────────────────────────────────── */}
      {status === 'error' && (
        <div style={{ padding: '0.75rem 1rem', border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.08)', marginBottom: '1rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#f87171' }}>{errorMsg}</p>
        </div>
      )}
      {status === 'success' && (
        <div style={{ padding: '0.75rem 1rem', border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)', marginBottom: '1rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#4ade80' }}>✓ 경기가 기록되었습니다</p>
        </div>
      )}

      {/* ── 저장 버튼 ─────────────────────────────────────────────── */}
      <button type="submit" disabled={isPending}
        style={{
          width: '100%', padding: '1rem',
          fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em',
          background: isPending ? 'rgba(201,168,76,0.4)' : 'var(--gold)',
          color: '#0b2218', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
          fontWeight: 700, transition: 'all 0.2s',
        }}>
        {isPending ? '저장 중...' : '경기 기록 저장'}
      </button>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// ParticipantRow
// ──────────────────────────────────────────────────────────────────────────

interface RowProps {
  row: RowState; gameType: GameType; players: Player[];
  usedIds: string[]; onChange: (p: Partial<RowState>) => void; onRemove?: () => void;
}

const selS: React.CSSProperties = {
  padding: '0.45rem 0.65rem',
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.18)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
  fontSize: '0.9rem', outline: 'none',
};

function ParticipantRow({ row, gameType, players, usedIds, onChange, onRemove }: RowProps) {
  const available = players.filter(p => !usedIds.includes(p.id));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 0.9rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(201,168,76,0.1)' }}>
      {/* 플레이어 선택 */}
      <select value={row.player_id} onChange={e => onChange({ player_id: e.target.value })}
        style={{ ...selS, flex: 1, minWidth: 140 }}>
        <option value="">— 선택 —</option>
        {available.map(p => <option key={p.id} value={p.id}>{p.nickname}</option>)}
        {row.player_id && players.find(p => p.id === row.player_id) && (
          <option value={row.player_id}>{players.find(p => p.id === row.player_id)?.nickname}</option>
        )}
      </select>

      {/* 팀전 */}
      {gameType === 'team' && (
        <select value={row.team} onChange={e => onChange({ team: e.target.value, is_winner: null })} style={selS}>
          <option value="">팀</option>
          <option value="A">A팀</option>
          <option value="B">B팀</option>
        </select>
      )}

      {/* 1vs多 */}
      {gameType === 'onevsmany' && (
        <select value={row.team} onChange={e => onChange({ team: e.target.value, is_winner: null })} style={selS}>
          <option value="">팀</option>
          <option value="solo">1인팀</option>
          <option value="group">다인팀</option>
        </select>
      )}

      {/* 마피아 */}
      {gameType === 'mafia' && (
        <>
          <select value={row.role} onChange={e => onChange({ role: e.target.value })} style={selS}>
            <option value="">역할</option>
            <option value="citizen">시민</option>
            <option value="mafia">마피아</option>
            <option value="special">특수</option>
          </select>
          <select value={row.is_winner === null ? '' : row.is_winner ? 'win' : 'lose'}
            onChange={e => onChange({ is_winner: e.target.value === 'win' ? true : e.target.value === 'lose' ? false : null })}
            style={selS}>
            <option value="">결과</option>
            <option value="win">승리</option>
            <option value="lose">패배</option>
          </select>
        </>
      )}

      {/* 데스매치 */}
      {gameType === 'deathmatch' && (
        <select value={row.is_winner === null ? '' : row.is_winner ? 'win' : 'lose'}
          onChange={e => onChange({ is_winner: e.target.value === 'win' ? true : e.target.value === 'lose' ? false : null })}
          style={selS}>
          <option value="">결과</option>
          <option value="win">승리</option>
          <option value="lose">패배</option>
        </select>
      )}

      {/* 협력 MVP */}
      {gameType === 'coop' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: row.is_mvp ? '#e879f9' : 'var(--white-dim)', opacity: row.is_mvp ? 1 : 0.6 }}>
          <input type="checkbox" checked={row.is_mvp} onChange={e => onChange({ is_mvp: e.target.checked })} style={{ accentColor: '#e879f9' }} />
          MVP
        </label>
      )}

      {/* 순위 */}
      {gameType === 'ranking' && (
        <input type="number" min={1} placeholder="순위" value={row.rank}
          onChange={e => onChange({ rank: e.target.value })}
          style={{ ...selS, width: 72, textAlign: 'center' }} />
      )}

      {/* 승패 뱃지 */}
      {row.is_winner === true && (
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: '#4ade80', letterSpacing: '0.05em' }}>승</span>
      )}
      {row.is_winner === false && (
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: '#f87171', letterSpacing: '0.05em' }}>패</span>
      )}

      {onRemove && (
        <button type="button" onClick={onRemove}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.3, padding: '0 0.2rem' }}>
          ✕
        </button>
      )}
    </div>
  );
}
