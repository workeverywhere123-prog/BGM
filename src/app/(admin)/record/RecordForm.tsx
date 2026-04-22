'use client';

import { useState, useTransition } from 'react';
import { calcChips } from '@/domain/chip';
import { recordMatchAction, ensureMeetingAction } from './actions';
import type { GameType, MafiaRole, ParticipantInput } from '@/types/domain';

interface Player {
  id: string;
  nickname: string;
  username: string;
}

interface Meeting {
  id: string;
  number: number;
  held_at: string;
}

interface RecordFormProps {
  players: Player[];
  meetings: Meeting[];
  leagueId: string;
}

const GAME_TYPE_LABELS: Record<GameType, string> = {
  team: '팀전',
  mafia: '마피아',
  deathmatch: '데스매치',
  onevsmany: '1vs多',
  coop: '협력',
  ranking: '순위게임',
};

const GAME_TYPE_DESC: Record<GameType, string> = {
  team: '승 +1 / 패 -1',
  mafia: '마피아승 +2 · 시민승 +1 · 특수+3 / 패 0',
  deathmatch: '인당 3칩 베팅 → 승자독식',
  onevsmany: '1인승 +2 · 다인승 +1 / 패 -1',
  coop: 'MVP 득표자 +1',
  ranking: '순위별 차등 칩',
};

type RowState = {
  player_id: string;
  team: string;       // 'A' | 'B' | 'solo' | 'group' | ''
  rank: string;       // numeric string
  role: string;       // 'mafia' | 'citizen' | 'special' | ''
  is_winner: boolean | null;
  is_mvp: boolean;
};

function emptyRow(player_id = ''): RowState {
  return { player_id, team: '', rank: '', role: '', is_winner: null, is_mvp: false };
}

export function RecordForm({ players, meetings, leagueId }: RecordFormProps) {
  const [gameType, setGameType] = useState<GameType>('team');
  const [meetingId, setMeetingId] = useState<string>(meetings[0]?.id ?? '');
  const [newMeetingNumber, setNewMeetingNumber] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [rows, setRows] = useState<RowState[]>([emptyRow(), emptyRow()]);
  const [bet, setBet] = useState(3);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  // 칩 미리보기
  const previewChips = (): { player_id: string; chip_change: number }[] => {
    try {
      const inputs = toParticipantInputs();
      if (inputs.length < 2) return [];
      return calcChips(gameType, inputs, { deathmatch_bet: bet });
    } catch {
      return [];
    }
  };

  const toParticipantInputs = (): ParticipantInput[] => {
    return rows
      .filter((r) => r.player_id)
      .map((r) => ({
        player_id: r.player_id,
        team: r.team || undefined,
        rank: r.rank ? parseInt(r.rank) : undefined,
        role: (r.role as MafiaRole) || undefined,
        is_winner: r.is_winner ?? undefined,
        is_mvp: r.is_mvp,
      }));
  };

  const updateRow = (i: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  // 팀전/1vs多: 승리팀을 선택하면 is_winner 자동 설정
  const setWinnerTeam = (winTeam: string) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        is_winner: r.team === winTeam ? true : r.team ? false : null,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setErrorMsg('');

    const participants = toParticipantInputs();
    if (participants.length < 2) {
      setErrorMsg('참여자를 2명 이상 입력해주세요');
      setStatus('error');
      return;
    }

    startTransition(async () => {
      let resolvedMeetingId = meetingId;

      // 새 모임 생성
      if (!meetingId && newMeetingNumber) {
        const res = await ensureMeetingAction(
          leagueId,
          parseInt(newMeetingNumber),
          new Date(newMeetingDate).toISOString()
        );
        if (!res.ok) {
          setErrorMsg(res.error.message);
          setStatus('error');
          return;
        }
        resolvedMeetingId = res.data.meeting_id;
      }

      if (!resolvedMeetingId) {
        setErrorMsg('모임을 선택하거나 새 모임을 입력해주세요');
        setStatus('error');
        return;
      }

      const res = await recordMatchAction({
        meeting_id: resolvedMeetingId,
        game_type: gameType,
        note: note || undefined,
        participants,
        deathmatch_bet: bet,
      });

      if (res.ok) {
        setStatus('success');
        setRows([emptyRow(), emptyRow()]);
        setNote('');
      } else {
        setErrorMsg(res.error.message);
        setStatus('error');
      }
    });
  };

  const preview = previewChips();
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 모임 선택 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50">모임 회차</h2>
        {meetings.length > 0 && (
          <select
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
          >
            <option value="">— 새 모임 입력 —</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.number}회 ({m.held_at.slice(0, 10)})
              </option>
            ))}
          </select>
        )}
        {!meetingId && (
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="회차 번호 (예: 42)"
              value={newMeetingNumber}
              onChange={(e) => setNewMeetingNumber(e.target.value)}
              className="w-32 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={newMeetingDate}
              onChange={(e) => setNewMeetingDate(e.target.value)}
              className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
            />
          </div>
        )}
      </section>

      {/* 게임 타입 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50">게임 타입</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(GAME_TYPE_LABELS) as GameType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setGameType(t);
                setRows(rows.map((r) => emptyRow(r.player_id)));
              }}
              className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                gameType === t
                  ? 'border-white bg-white text-black'
                  : 'border-white/20 hover:bg-white/10'
              }`}
            >
              {GAME_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="text-xs opacity-50">{GAME_TYPE_DESC[gameType]}</p>
      </section>

      {/* 데스매치 베팅 설정 */}
      {gameType === 'deathmatch' && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50">
            인당 베팅 칩
          </h2>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBet(n)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  bet === n ? 'border-white bg-white text-black' : 'border-white/20 hover:bg-white/10'
                }`}
              >
                {n}칩
              </button>
            ))}
            <input
              type="number"
              min={1}
              value={bet}
              onChange={(e) => setBet(parseInt(e.target.value) || 3)}
              className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
            />
          </div>
        </section>
      )}

      {/* 참여자 목록 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50">참여자</h2>
          <button
            type="button"
            onClick={addRow}
            className="text-xs opacity-50 hover:opacity-100 underline"
          >
            + 추가
          </button>
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <ParticipantRow
              key={i}
              row={row}
              index={i}
              gameType={gameType}
              players={players}
              usedIds={rows.map((r) => r.player_id).filter((id) => id && id !== row.player_id)}
              onChange={(patch) => updateRow(i, patch)}
              onRemove={rows.length > 2 ? () => removeRow(i) : undefined}
              onSetWinner={
                (gameType === 'team' || gameType === 'onevsmany') && row.team
                  ? () => setWinnerTeam(row.team)
                  : undefined
              }
            />
          ))}
        </div>

        {/* 팀 승리 설정 버튼 (팀전 / 1vs多) */}
        {(gameType === 'team' || gameType === 'onevsmany') && (
          <div className="flex gap-2 pt-1">
            <span className="text-xs opacity-50">승리팀:</span>
            {['A', 'B'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWinnerTeam(t)}
                className="rounded border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
              >
                {t}팀 승리
              </button>
            ))}
            {gameType === 'onevsmany' && (
              <button
                type="button"
                onClick={() => setWinnerTeam('solo')}
                className="rounded border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
              >
                1인팀 승리
              </button>
            )}
          </div>
        )}
      </section>

      {/* 칩 변동 미리보기 */}
      {preview.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider opacity-50">칩 변동 미리보기</h2>
          <div className="space-y-1">
            {preview.map((r) => {
              const p = playerMap[r.player_id];
              if (!p) return null;
              return (
                <div key={r.player_id} className="flex items-center justify-between text-sm">
                  <span className="opacity-80">{p.nickname}</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      r.chip_change > 0
                        ? 'text-green-400'
                        : r.chip_change < 0
                        ? 'text-red-400'
                        : 'opacity-40'
                    }`}
                  >
                    {r.chip_change > 0 ? '+' : ''}{r.chip_change}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 메모 */}
      <section>
        <input
          type="text"
          placeholder="메모 (선택)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm opacity-70 focus:opacity-100"
        />
      </section>

      {/* 에러/성공 메시지 */}
      {status === 'error' && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMsg}
        </p>
      )}
      {status === 'success' && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          경기가 기록되었습니다!
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-white py-2.5 font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? '저장 중...' : '경기 기록 저장'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────
// ParticipantRow — 참여자 한 줄
// ─────────────────────────────────────────────────────────

interface RowProps {
  row: RowState;
  index: number;
  gameType: GameType;
  players: Player[];
  usedIds: string[];
  onChange: (patch: Partial<RowState>) => void;
  onRemove?: () => void;
  onSetWinner?: () => void;
}

function ParticipantRow({ row, gameType, players, usedIds, onChange, onRemove }: RowProps) {
  const available = players.filter((p) => !usedIds.includes(p.id));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
      {/* 플레이어 선택 */}
      <select
        value={row.player_id}
        onChange={(e) => onChange({ player_id: e.target.value })}
        className="flex-1 min-w-32 rounded border border-white/10 bg-black/30 px-2 py-1 text-sm"
      >
        <option value="">— 선택 —</option>
        {available.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname}
          </option>
        ))}
        {row.player_id && playerById(row.player_id, players) && (
          <option value={row.player_id}>{playerById(row.player_id, players)?.nickname}</option>
        )}
      </select>

      {/* 팀전 / 1vs多 팀 선택 */}
      {(gameType === 'team') && (
        <select
          value={row.team}
          onChange={(e) => onChange({ team: e.target.value, is_winner: null })}
          className="rounded border border-white/10 bg-black/30 px-2 py-1 text-sm"
        >
          <option value="">팀</option>
          <option value="A">A팀</option>
          <option value="B">B팀</option>
        </select>
      )}
      {gameType === 'onevsmany' && (
        <select
          value={row.team}
          onChange={(e) => onChange({ team: e.target.value, is_winner: null })}
          className="rounded border border-white/10 bg-black/30 px-2 py-1 text-sm"
        >
          <option value="">팀</option>
          <option value="solo">1인팀</option>
          <option value="group">다인팀</option>
        </select>
      )}

      {/* 마피아 역할 + 승패 */}
      {gameType === 'mafia' && (
        <>
          <select
            value={row.role}
            onChange={(e) => onChange({ role: e.target.value })}
            className="rounded border border-white/10 bg-black/30 px-2 py-1 text-sm"
          >
            <option value="">역할</option>
            <option value="citizen">시민</option>
            <option value="mafia">마피아</option>
            <option value="special">특수</option>
          </select>
          <select
            value={row.is_winner === null ? '' : row.is_winner ? 'win' : 'lose'}
            onChange={(e) =>
              onChange({ is_winner: e.target.value === 'win' ? true : e.target.value === 'lose' ? false : null })
            }
            className="rounded border border-white/10 bg-black/30 px-2 py-1 text-sm"
          >
            <option value="">결과</option>
            <option value="win">승리</option>
            <option value="lose">패배</option>
          </select>
        </>
      )}

      {/* 데스매치 승패 */}
      {gameType === 'deathmatch' && (
        <select
          value={row.is_winner === null ? '' : row.is_winner ? 'win' : 'lose'}
          onChange={(e) =>
            onChange({ is_winner: e.target.value === 'win' ? true : e.target.value === 'lose' ? false : null })
          }
          className="rounded border border-white/10 bg-black/30 px-2 py-1 text-sm"
        >
          <option value="">결과</option>
          <option value="win">승리</option>
          <option value="lose">패배</option>
        </select>
      )}

      {/* 협력 MVP */}
      {gameType === 'coop' && (
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={row.is_mvp}
            onChange={(e) => onChange({ is_mvp: e.target.checked })}
            className="accent-white"
          />
          MVP
        </label>
      )}

      {/* 순위 */}
      {gameType === 'ranking' && (
        <input
          type="number"
          min={1}
          placeholder="순위"
          value={row.rank}
          onChange={(e) => onChange({ rank: e.target.value })}
          className="w-16 rounded border border-white/10 bg-black/30 px-2 py-1 text-sm"
        />
      )}

      {/* is_winner 배지 표시 */}
      {row.is_winner === true && (
        <span className="text-xs text-green-400">승</span>
      )}
      {row.is_winner === false && (
        <span className="text-xs text-red-400">패</span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-xs opacity-30 hover:opacity-70"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function playerById(id: string, players: Player[]) {
  return players.find((p) => p.id === id);
}
