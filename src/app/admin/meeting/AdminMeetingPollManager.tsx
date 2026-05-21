'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface PollOption { label: string; date: string; time?: string }
interface Poll {
  id: string;
  title: string;
  deadline: string;
  status: string;
  options: PollOption[];
  voteCount: number;
  optionVotes: string[][];
  meeting_id?: string | null;
}

const inp: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(201,168,76,0.2)',
  color: 'var(--foreground)',
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: '1rem',
  padding: '0.4rem 0.7rem',
  outline: 'none',
  width: '100%',
};

const btnGold: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em',
  padding: '0.5rem 1.2rem',
  background: 'var(--gold)', color: '#0b2218',
  border: 'none', cursor: 'pointer', fontWeight: 700,
};

const btnOutline: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em',
  padding: '0.35rem 0.8rem',
  background: 'transparent', color: 'var(--gold)',
  border: '1px solid rgba(201,168,76,0.3)', cursor: 'pointer',
};

interface CloseForm {
  pollId: string;
  pollTitle: string;
  options: PollOption[];
  optionVotes: string[][];
  confirmedDate: string;
  meetingNumber: string;
  rsvpDeadline: string;
  note: string;
}

export default function AdminMeetingPollManager({ initialPolls }: { initialPolls: Poll[] }) {
  const router = useRouter();
  const [polls, setPolls] = useState(initialPolls);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startT] = useTransition();
  const [closeForm, setCloseForm] = useState<CloseForm | null>(null);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { label: '', date: '', time: '14:00' },
    { label: '', date: '', time: '14:00' },
  ]);

  const addOption = () => setOptions(prev => [...prev, { label: '', date: '', time: '14:00' }]);
  const removeOption = (i: number) => setOptions(prev => prev.filter((_, j) => j !== i));
  const updateOption = (i: number, field: keyof PollOption, val: string) =>
    setOptions(prev => prev.map((o, j) => j === i ? { ...o, [field]: val } : o));

  const autoLabel = (opt: PollOption) => {
    if (opt.label) return opt.label;
    if (!opt.date) return '';
    const d = new Date(opt.date + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  const createPoll = () => startT(async () => {
    const filledOptions = options
      .filter(o => o.date)
      .map(o => ({ ...o, label: autoLabel(o) }));
    if (!title || !deadline || filledOptions.length < 2) {
      alert('제목, 마감일, 날짜 옵션 2개 이상을 입력해주세요'); return;
    }
    const res = await fetch('/api/meeting/polls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, options: filledOptions, deadline: new Date(deadline).toISOString() }),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    const newPoll = await res.json();
    setPolls(prev => [{ ...newPoll, voteCount: 0, optionVotes: filledOptions.map(() => []) }, ...prev]);
    setShowCreate(false);
    setTitle(''); setDesc(''); setDeadline('');
    setOptions([{ label: '', date: '', time: '14:00' }, { label: '', date: '', time: '14:00' }]);
    alert('투표가 생성되었습니다. 전체 회원에게 알림이 발송되었습니다.');
  });

  // 마감 버튼 → 모임 확정 폼 열기
  const openCloseForm = (poll: Poll) => {
    // 최다 득표 옵션 인덱스 찾기
    const maxVotes = Math.max(...(poll.optionVotes ?? []).map(v => v.length));
    const winnerIdx = (poll.optionVotes ?? []).findIndex(v => v.length === maxVotes);
    const winnerOpt = poll.options[winnerIdx >= 0 ? winnerIdx : 0];

    // 확정 날짜: 날짜 + 시간 합쳐서 datetime-local 형식으로
    let confirmedDate = '';
    if (winnerOpt?.date) {
      const time = winnerOpt.time ?? '14:00';
      confirmedDate = `${winnerOpt.date}T${time}`;
    }

    setCloseForm({
      pollId: poll.id,
      pollTitle: poll.title,
      options: poll.options,
      optionVotes: poll.optionVotes ?? [],
      confirmedDate,
      meetingNumber: '',
      rsvpDeadline: '',
      note: '',
    });
  };

  const submitClose = () => startT(async () => {
    if (!closeForm) return;
    if (!closeForm.meetingNumber || !closeForm.confirmedDate) {
      alert('모임 회차 번호와 확정 날짜를 입력해주세요'); return;
    }
    const res = await fetch(`/api/meeting/polls/${closeForm.pollId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'close',
        meeting_number: closeForm.meetingNumber,
        confirmed_date: closeForm.confirmedDate,
        rsvp_deadline: closeForm.rsvpDeadline || null,
        note: closeForm.note || null,
      }),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    const { meeting_id } = await res.json();
    setPolls(prev => prev.map(p => p.id === closeForm.pollId
      ? { ...p, status: 'closed', meeting_id }
      : p,
    ));
    setCloseForm(null);
    router.refresh();
  });

  const deletePoll = (id: string) => startT(async () => {
    if (!confirm('투표를 삭제하시겠습니까?')) return;
    await fetch(`/api/meeting/polls/${id}`, { method: 'DELETE' });
    setPolls(prev => prev.filter(p => p.id !== id));
  });

  return (
    <div style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '1.5rem', background: 'rgba(8,20,14,0.4)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.2em', color: 'var(--gold)' }}>
          모임 일정 투표
        </p>
        <button onClick={() => setShowCreate(v => !v)} style={btnOutline}>
          {showCreate ? '취소' : '+ 새 투표 생성'}
        </button>
      </div>

      {/* ── 투표 생성 폼 ── */}
      {showCreate && (
        <div style={{ border: '1px solid rgba(201,168,76,0.15)', padding: '1.2rem', background: 'rgba(30,74,52,0.1)', marginBottom: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>제목 *</p>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 5월 정기 모임 날짜 투표" style={inp} />
            </div>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>투표 마감 일시 *</p>
              <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: '0.8rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>설명 (선택)</p>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="투표 관련 안내 사항" style={inp} />
          </div>

          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.5rem', marginTop: '0.8rem' }}>
            날짜 옵션 * (2개 이상)
          </p>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px auto', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
              <input value={opt.date} type="date" onChange={e => updateOption(i, 'date', e.target.value)} style={inp} placeholder="날짜" />
              <input value={opt.label} onChange={e => updateOption(i, 'label', e.target.value)} placeholder={opt.date ? autoLabel(opt) : '표시명 (자동생성)'} style={inp} />
              <input value={opt.time ?? ''} onChange={e => updateOption(i, 'time', e.target.value)} placeholder="시간" style={inp} />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} style={{ ...btnOutline, color: '#f87171', borderColor: '#f8717144', padding: '0.35rem 0.6rem' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={addOption} style={{ ...btnOutline, marginTop: '0.4rem', fontSize: '0.5rem' }}>+ 날짜 추가</button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button onClick={createPoll} disabled={isPending} style={btnGold}>
              {isPending ? '...' : '투표 생성 & 알림 발송'}
            </button>
          </div>
        </div>
      )}

      {/* ── 모임 확정 폼 (마감 시) ── */}
      {closeForm && (
        <div style={{ border: '1px solid rgba(251,146,60,0.3)', padding: '1.5rem', background: 'rgba(251,146,60,0.04)', marginBottom: '1.2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: '#fb923c', marginBottom: '1rem' }}>
            모임 확정 — {closeForm.pollTitle}
          </p>

          {/* 투표 결과 */}
          <div style={{ marginBottom: '1.2rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>투표 결과</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {closeForm.options.map((opt, i) => {
                const votes = closeForm.optionVotes[i]?.length ?? 0;
                const total = closeForm.optionVotes.reduce((s, v) => s + v.length, 0);
                const pct = total > 0 ? Math.round(votes / total * 100) : 0;
                const isWinner = votes === Math.max(...closeForm.optionVotes.map(v => v.length));
                return (
                  <div key={i} onClick={() => setCloseForm(f => f ? { ...f, confirmedDate: `${opt.date}T${opt.time ?? '14:00'}` } : f)}
                    style={{ padding: '0.5rem 0.8rem', background: isWinner ? 'rgba(74,222,128,0.06)' : 'rgba(30,74,52,0.1)', border: `1px solid ${closeForm.confirmedDate.startsWith(opt.date) ? 'rgba(74,222,128,0.4)' : isWinner ? 'rgba(74,222,128,0.2)' : 'rgba(201,168,76,0.1)'}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: isWinner ? '#4ade80' : 'var(--foreground)' }}>
                      {opt.label || opt.date} {opt.time && `${opt.time}`}
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: isWinner ? '#4ade80' : 'var(--white-dim)' }}>
                      {votes}표 ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: 'rgba(244,239,230,0.3)', marginTop: '0.4rem' }}>날짜를 클릭하면 확정 날짜로 선택됩니다</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>모임 회차 번호 *</p>
              <input
                value={closeForm.meetingNumber}
                onChange={e => setCloseForm(f => f ? { ...f, meetingNumber: e.target.value } : f)}
                placeholder="예: 57"
                type="number"
                style={inp}
              />
            </div>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>확정 날짜·시간 *</p>
              <input
                type="datetime-local"
                value={closeForm.confirmedDate}
                onChange={e => setCloseForm(f => f ? { ...f, confirmedDate: e.target.value } : f)}
                style={inp}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>참석 투표 마감 시간</p>
              <input
                type="datetime-local"
                value={closeForm.rsvpDeadline}
                onChange={e => setCloseForm(f => f ? { ...f, rsvpDeadline: e.target.value } : f)}
                style={inp}
              />
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.25)', marginTop: '0.3rem' }}>마감 30분 전 알림 · 미투표 시 LAPIS -1</p>
            </div>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>메모 (선택)</p>
              <input
                value={closeForm.note}
                onChange={e => setCloseForm(f => f ? { ...f, note: e.target.value } : f)}
                placeholder="장소, 주의사항 등"
                style={inp}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setCloseForm(null)} style={btnOutline}>취소</button>
            <button onClick={submitClose} disabled={isPending} style={{ ...btnGold, background: '#fb923c' }}>
              {isPending ? '처리 중...' : '모임 확정 & 전체 알림 발송'}
            </button>
          </div>
        </div>
      )}

      {/* ── 투표 목록 ── */}
      {polls.length === 0 ? (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.25)', textAlign: 'center', padding: '1.5rem 0' }}>
          생성된 투표가 없습니다
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {polls.map(poll => {
            const isOpen = poll.status === 'open' && new Date(poll.deadline) > new Date();
            const dl = new Date(poll.deadline);
            return (
              <div key={poll.id} style={{ padding: '0.8rem 1rem', background: 'rgba(30,74,52,0.1)', borderLeft: `2px solid ${isOpen ? '#4ade80' : poll.meeting_id ? '#fb923c' : 'rgba(201,168,76,0.2)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.12em', color: isOpen ? '#4ade80' : poll.meeting_id ? '#fb923c' : 'rgba(244,239,230,0.3)', border: `1px solid ${isOpen ? '#4ade8044' : poll.meeting_id ? '#fb923c44' : 'rgba(244,239,230,0.1)'}`, padding: '0.08rem 0.35rem' }}>
                        {isOpen ? 'OPEN' : poll.meeting_id ? '모임 확정' : 'CLOSED'}
                      </span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: 'rgba(244,239,230,0.35)' }}>
                        {poll.voteCount}명 참여 · {poll.options.length}개 옵션
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{poll.title}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.3)', marginTop: '0.1rem' }}>
                      마감: {dl.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isOpen && (
                      <button onClick={() => openCloseForm(poll)} disabled={isPending} style={{ ...btnOutline, color: '#fb923c', borderColor: '#fb923c44', fontSize: '0.5rem' }}>
                        마감 & 모임 확정
                      </button>
                    )}
                    <button onClick={() => deletePoll(poll.id)} disabled={isPending} style={{ ...btnOutline, color: '#f87171', borderColor: '#f8717144', fontSize: '0.5rem' }}>
                      삭제
                    </button>
                  </div>
                </div>

                {/* 옵션별 득표 미리보기 */}
                {poll.optionVotes && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {poll.options.map((opt, i) => {
                      const votes = poll.optionVotes[i]?.length ?? 0;
                      const total = poll.optionVotes.reduce((s, v) => s + v.length, 0);
                      const pct = total > 0 ? Math.round(votes / total * 100) : 0;
                      return (
                        <span key={i} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', padding: '0.15rem 0.5rem', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(244,239,230,0.5)' }}>
                          {opt.label || opt.date} — {votes}표 {total > 0 ? `(${pct}%)` : ''}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
