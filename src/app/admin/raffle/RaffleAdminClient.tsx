'use client';

import { useState } from 'react';
import type { RaffleRow } from './types';

/* ── Internal types ── */
interface Entry {
  player_id: string; tickets: number; created_at: string | null;
  players: { nickname: string; username: string } | null;
}
interface Quarter { id: string; name: string; }

/* ── Status config ── */
const ST = {
  open:   { text: '모집중',       color: '#4ade80', border: 'rgba(74,222,128,0.35)',  bg: 'rgba(74,222,128,0.06)' },
  closed: { text: '마감 · 추첨대기', color: '#fb923c', border: 'rgba(251,146,60,0.35)',  bg: 'rgba(251,146,60,0.06)' },
  drawn:  { text: '추첨 완료',     color: 'var(--gold)', border: 'rgba(201,168,76,0.35)', bg: 'rgba(201,168,76,0.06)' },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

/* ═══════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════ */
export default function RaffleAdminClient({
  initialRaffles, quarters,
}: {
  initialRaffles: RaffleRow[]; quarters: Quarter[];
}) {
  const [raffles, setRaffles] = useState(initialRaffles);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entriesMap, setEntriesMap] = useState<Record<string, Entry[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRaffle, setEditRaffle] = useState<RaffleRow | null>(null);

  /* Stats */
  const openCount  = raffles.filter(r => r.status === 'open').length;
  const totalPart  = raffles.reduce((s, r) => s + r.entry_count, 0);

  /* ── Toggle / load entries ── */
  async function toggleEntries(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (entriesMap[id]) return;
    const res = await fetch(`/api/admin/raffles/${id}`);
    if (res.ok) {
      const { entries } = await res.json();
      setEntriesMap(m => ({ ...m, [id]: entries }));
    }
  }

  /* ── Close ── */
  async function handleClose(id: string) {
    if (!confirm('참가 모집을 마감할까요?')) return;
    setLoadingId(id);
    await fetch(`/api/raffle/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    });
    setRaffles(r => r.map(x => x.id === id ? { ...x, status: 'closed' } : x));
    setLoadingId(null);
  }

  /* ── Reopen ── */
  async function handleReopen(id: string) {
    if (!confirm('추첨을 다시 열까요?')) return;
    setLoadingId(id);
    await fetch(`/api/admin/raffles/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    });
    setRaffles(r => r.map(x => x.id === id ? { ...x, status: 'open' } : x));
    setLoadingId(null);
  }

  /* ── Draw ── */
  async function handleDraw(id: string) {
    if (!confirm('당첨자를 추첨하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    setLoadingId(id);
    const res = await fetch(`/api/raffle/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'draw' }),
    });
    const d = await res.json();
    if (!res.ok) { alert(d.error); setLoadingId(null); return; }
    setRaffles(r => r.map(x => x.id === id ? {
      ...x, status: 'drawn',
      winner_id: d.winner.id,
      winner_nickname: d.winner.nickname,
      winner_username: d.winner.username,
    } : x));
    // Update entries highlight
    setEntriesMap(m => ({ ...m, [id]: [] })); // force reload
    setLoadingId(null);
    alert(`🏆 당첨자: ${d.winner.nickname} (@${d.winner.username})`);
  }

  /* ── Delete ── */
  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 추첨을 삭제할까요?\n참가자 기록도 모두 삭제됩니다.`)) return;
    setLoadingId(id);
    const res = await fetch(`/api/admin/raffles/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { alert(d.error); setLoadingId(null); return; }
    setRaffles(r => r.filter(x => x.id !== id));
    setLoadingId(null);
  }

  /* ── Create callback ── */
  function onCreated(raffle: RaffleRow) {
    setRaffles(prev => [raffle, ...prev]);
    setShowCreate(false);
  }

  /* ── Edit callback ── */
  function onEdited(id: string, updates: Partial<RaffleRow>) {
    setRaffles(r => r.map(x => x.id === id ? { ...x, ...updates } : x));
    setEditRaffle(null);
  }

  /* ──────────────── Render ──────────────── */
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.8rem', color: 'var(--foreground)', lineHeight: 1 }}>추첨 관리</h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>RAFFLE MANAGEMENT</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ padding: '0.65rem 1.6rem', background: 'var(--gold)', border: 'none', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.12em' }}>
          + 새 추첨 만들기
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '2rem' }}>
        {[
          { label: '전체 추첨', value: String(raffles.length) },
          { label: '진행중', value: String(openCount), color: '#4ade80' },
          { label: '누적 참가', value: totalPart + '건' },
        ].map(s => (
          <div key={s.label} style={{ padding: '0.9rem 1rem', border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(30,74,52,0.1)', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>{s.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', color: s.color ?? 'var(--foreground)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {raffles.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
            추첨이 없습니다. 새 추첨을 만들어보세요.
          </div>
        )}

        {raffles.map(r => {
          const st = ST[r.status];
          const isLoading = loadingId === r.id;
          const isExpanded = expandedId === r.id;
          const entries = entriesMap[r.id] ?? [];
          const isOverdue = r.ends_at && new Date(r.ends_at) < new Date() && r.status === 'open';

          return (
            <div key={r.id} style={{ border: `1px solid ${st.border}`, background: 'rgba(15,40,28,0.4)' }}>
              {/* Card */}
              <div style={{ padding: '1rem 1.2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', letterSpacing: '0.1em', padding: '0.1rem 0.45rem', color: st.color, border: `1px solid ${st.border}`, background: st.bg }}>
                      {st.text}
                    </span>
                    {isOverdue && (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: '#ff8888', border: '1px solid rgba(255,100,100,0.3)', padding: '0.1rem 0.4rem' }}>마감기한 초과</span>
                    )}
                    {r.ends_at && r.status !== 'drawn' && !isOverdue && (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: '#fb923c', opacity: 0.7 }}>
                        마감 {fmtDate(r.ends_at)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', color: 'var(--foreground)', lineHeight: 1.2, marginBottom: '0.15rem' }}>{r.name}</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold)' }}>🎁 {r.prize}</p>
                  {r.winner_nickname && (
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold)', marginTop: '0.2rem' }}>
                      🏆 당첨: {r.winner_nickname}
                      <span style={{ opacity: 0.55, marginLeft: '0.3rem' }}>@{r.winner_username}</span>
                      {r.drawn_at && <span style={{ opacity: 0.45, marginLeft: '0.5rem' }}>{fmtDate(r.drawn_at)}</span>}
                    </p>
                  )}
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'var(--white-dim)', opacity: 0.4, marginTop: '0.2rem' }}>
                    생성 {fmtDate(r.created_at)}
                  </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'var(--gold-dim)', marginBottom: '0.1rem' }}>참가자</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', color: 'var(--foreground)', lineHeight: 1 }}>{r.entry_count}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.42rem', color: 'var(--white-dim)', opacity: 0.4 }}>명</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'var(--gold-dim)', marginBottom: '0.1rem' }}>총 티켓</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', color: 'var(--foreground)', lineHeight: 1 }}>{r.total_tickets}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.42rem', color: 'var(--white-dim)', opacity: 0.4 }}>장</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* 참가자 토글 */}
                  <button onClick={() => toggleEntries(r.id)}
                    style={{ padding: '0.35rem 0.7rem', border: `1px solid ${isExpanded ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.2)'}`, background: isExpanded ? 'rgba(201,168,76,0.1)' : 'transparent', color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', cursor: 'pointer' }}>
                    참가자 {isExpanded ? '▲' : '▼'}
                  </button>

                  {r.status === 'open' && (
                    <>
                      <button onClick={() => setEditRaffle(r)}
                        style={{ padding: '0.35rem 0.7rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', cursor: 'pointer' }}>
                        수정
                      </button>
                      <button onClick={() => handleClose(r.id)} disabled={isLoading}
                        style={{ padding: '0.35rem 0.7rem', border: '1px solid rgba(251,146,60,0.4)', background: 'transparent', color: '#fb923c', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', cursor: 'pointer' }}>
                        {isLoading ? '...' : '마감'}
                      </button>
                    </>
                  )}

                  {r.status === 'closed' && (
                    <>
                      <button onClick={() => handleReopen(r.id)} disabled={isLoading}
                        style={{ padding: '0.35rem 0.7rem', border: '1px solid rgba(74,222,128,0.35)', background: 'transparent', color: '#4ade80', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', cursor: 'pointer' }}>
                        재오픈
                      </button>
                      <button onClick={() => handleDraw(r.id)} disabled={isLoading || r.entry_count === 0}
                        style={{ padding: '0.38rem 1rem', border: 'none', background: (isLoading || r.entry_count === 0) ? 'rgba(201,168,76,0.3)' : 'var(--gold)', color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', fontWeight: 700, cursor: (isLoading || r.entry_count === 0) ? 'not-allowed' : 'pointer', letterSpacing: '0.08em' }}>
                        {isLoading ? '추첨중...' : r.entry_count === 0 ? '참가자 없음' : '🎲 추첨하기'}
                      </button>
                    </>
                  )}

                  {/* 삭제 (drawn 제외) */}
                  {r.status !== 'drawn' && (
                    <button onClick={() => handleDelete(r.id, r.name)} disabled={isLoading}
                      style={{ padding: '0.35rem 0.55rem', border: '1px solid rgba(255,100,100,0.22)', background: 'transparent', color: '#ff8888', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', cursor: 'pointer', opacity: 0.65 }}>
                      삭제
                    </button>
                  )}

                  {/* 공개 페이지 링크 */}
                  <a href={`/raffle/${r.id}`} target="_blank" rel="noreferrer"
                    style={{ padding: '0.35rem 0.55rem', border: '1px solid rgba(201,168,76,0.12)', background: 'transparent', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.48rem', textDecoration: 'none', opacity: 0.4 }}
                    title="공개 페이지 보기">
                    ↗
                  </a>
                </div>
              </div>

              {/* Entries panel */}
              {isExpanded && (
                <EntriesPanel
                  entries={entries}
                  totalTickets={r.total_tickets}
                  winnerId={r.winner_id}
                  isLoading={!entriesMap[r.id]}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateModal quarters={quarters} onClose={() => setShowCreate(false)} onCreated={onCreated} />
      )}

      {/* Edit Modal */}
      {editRaffle && (
        <EditModal raffle={editRaffle} onClose={() => setEditRaffle(null)} onSaved={onEdited} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Entries Panel
═══════════════════════════════════════════════ */
function EntriesPanel({ entries, totalTickets, winnerId, isLoading }: {
  entries: Entry[]; totalTickets: number; winnerId: string | null; isLoading: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.1em',
    padding: '0.3rem 0.6rem', border: '1px solid rgba(201,168,76,0.2)',
    background: 'rgba(0,0,0,0.2)', color: 'var(--white-dim)', cursor: 'pointer',
  };

  return (
    <div style={{ borderTop: '1px solid rgba(201,168,76,0.1)', padding: '1rem 1.2rem', background: 'rgba(0,0,0,0.2)' }}>
      {isLoading ? (
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold-dim)', opacity: 0.6 }}>로딩중...</p>
      ) : entries.length === 0 ? (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>참가자가 없습니다</p>
      ) : (
        <div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.7rem' }}>
            참가자 {entries.length}명 · 총 {totalTickets}장
          </p>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr 56px 70px 80px', gap: '0 0.8rem', borderBottom: '1px solid rgba(201,168,76,0.1)', paddingBottom: '0.35rem', marginBottom: '0.25rem' }}>
            {['#', '플레이어', '티켓', '확률', '참가일'].map(h => (
              <span key={h} style={{ ...inputStyle, border: 'none', background: 'none', padding: '0', color: 'var(--gold-dim)', fontSize: '0.46rem' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {entries.map((e, i) => {
            const pct = totalTickets > 0 ? ((e.tickets / totalTickets) * 100).toFixed(1) : '0';
            const isWinner = winnerId === e.player_id;
            return (
              <div key={e.player_id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 56px 70px 80px', gap: '0 0.8rem', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(201,168,76,0.04)', background: isWinner ? 'rgba(201,168,76,0.06)' : 'transparent' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.35 }}>{i + 1}</span>
                <div>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: isWinner ? 'var(--gold)' : 'var(--foreground)' }}>
                    {e.players?.nickname ?? '?'}
                    {isWinner && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#fb923c', marginLeft: '0.4rem' }}>🏆</span>}
                  </span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'var(--white-dim)', opacity: 0.38, marginLeft: '0.4rem' }}>@{e.players?.username}</span>
                </div>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.72rem', color: 'var(--gold)' }}>{e.tickets}장</span>
                <div>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>{pct}%</span>
                  <div style={{ marginTop: '0.2rem', height: 3, background: 'rgba(201,168,76,0.1)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, parseFloat(pct))}%`, background: isWinner ? 'var(--gold)' : 'rgba(201,168,76,0.45)' }} />
                  </div>
                </div>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'var(--white-dim)', opacity: 0.35 }}>
                  {e.created_at ? fmtDate(e.created_at) : '-'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Create Modal
═══════════════════════════════════════════════ */
interface CreateForm {
  name: string; prize: string; description: string;
  quarter_id: string; ends_at: string;
}

function CreateModal({ quarters, onClose, onCreated }: {
  quarters: Quarter[];
  onClose: () => void;
  onCreated: (r: RaffleRow) => void;
}) {
  const [form, setForm] = useState<CreateForm>({ name: '', prize: '', description: '', quarter_id: '', ends_at: '' });
  const [loading, setLoading] = useState(false);
  const up = (k: keyof CreateForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.prize) return;
    setLoading(true);
    const res = await fetch('/api/raffle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, prize: form.prize,
        description: form.description || undefined,
        quarter_id: form.quarter_id || undefined,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
      }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { alert(d.error); return; }
    // Reload the raffle from server to get full data
    const listRes = await fetch('/api/admin/raffles');
    if (listRes.ok) {
      const { raffles } = await listRes.json();
      const newRaffle = raffles.find((r: RaffleRow) => r.id === d.id);
      if (newRaffle) onCreated(newRaffle);
    }
    alert('추첨이 생성되고 전체 플레이어에게 알림이 발송됐습니다!');
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <ModalHeader title="새 추첨 만들기" subtitle="추첨 생성 시 전체 플레이어에게 알림이 발송됩니다" onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <Field label="추첨명 *">
            <input value={form.name} onChange={e => up('name', e.target.value)} required placeholder="예: 2026 Q2 추첨" style={iStyle} />
          </Field>
          <Field label="상품 *">
            <input value={form.prize} onChange={e => up('prize', e.target.value)} required placeholder="예: 스팀 기프트카드 $50" style={iStyle} />
          </Field>
          <Field label="설명 (선택)">
            <input value={form.description} onChange={e => up('description', e.target.value)} placeholder="추가 설명..." style={iStyle} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <Field label="마감일 (선택)">
              <input type="datetime-local" value={form.ends_at} onChange={e => up('ends_at', e.target.value)} style={{ ...iStyle, colorScheme: 'dark' }} />
            </Field>
            <Field label="분기 연결 (선택)">
              <select value={form.quarter_id} onChange={e => up('quarter_id', e.target.value)} style={{ ...iStyle, fontFamily: "'Cinzel', serif" }}>
                <option value="">미지정</option>
                {quarters.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={cancelBtn}>취소</button>
            <button type="submit" disabled={loading || !form.name || !form.prize}
              style={{ ...submitBtn, opacity: (!form.name || !form.prize) ? 0.5 : 1 }}>
              {loading ? '생성 중...' : '생성 + 알림 발송'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════════
   Edit Modal
═══════════════════════════════════════════════ */
function EditModal({ raffle, onClose, onSaved }: {
  raffle: RaffleRow;
  onClose: () => void;
  onSaved: (id: string, updates: Partial<RaffleRow>) => void;
}) {
  const [name, setName]       = useState(raffle.name);
  const [prize, setPrize]     = useState(raffle.prize);
  const [desc, setDesc]       = useState(raffle.description ?? '');
  const [endsAt, setEndsAt]   = useState(raffle.ends_at ? raffle.ends_at.slice(0, 16) : '');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const updates = {
      name, prize,
      description: desc || null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };
    const res = await fetch(`/api/admin/raffles/${raffle.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setLoading(false);
    if (res.ok) onSaved(raffle.id, updates);
    else alert((await res.json()).error);
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 480, padding: '2rem' }}>
        <ModalHeader title="추첨 수정" onClose={onClose} />
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <Field label="추첨명 *">
            <input value={name} onChange={e => setName(e.target.value)} required style={iStyle} />
          </Field>
          <Field label="상품 *">
            <input value={prize} onChange={e => setPrize(e.target.value)} required style={iStyle} />
          </Field>
          <Field label="설명 (선택)">
            <input value={desc} onChange={e => setDesc(e.target.value)} style={iStyle} />
          </Field>
          <Field label="마감일 (선택)">
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={{ ...iStyle, colorScheme: 'dark' }} />
          </Field>
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={cancelBtn}>취소</button>
            <button type="submit" disabled={loading} style={submitBtn}>{loading ? '저장 중...' : '저장하기'}</button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

/* ── Shared helpers ── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11,34,24,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h2 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.2rem', color: 'var(--foreground)', lineHeight: 1.1 }}>{title}</h2>
        {subtitle && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', marginTop: '0.3rem', letterSpacing: '0.1em' }}>{subtitle}</p>}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5 }}>✕</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
      {children}
    </div>
  );
}

const iStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.9rem', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.22)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', outline: 'none',
};
const cancelBtn: React.CSSProperties = {
  flex: 1, padding: '0.7rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent',
  color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', cursor: 'pointer',
};
const submitBtn: React.CSSProperties = {
  flex: 2, padding: '0.7rem', border: 'none', background: 'var(--gold)',
  color: '#0b2218', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em',
};
