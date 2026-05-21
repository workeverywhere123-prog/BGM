'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LapisIcon from '@/components/LapisIcon';

interface Player { id: string; nickname: string; username: string; avatar_url?: string | null; }
interface Attendance { player_id: string; status: 'attended' | 'late' | 'absent'; voted: boolean; }
interface RsvpEntry { player_id: string; status: string; players: Player | null; }
interface Meeting { id: string; number: number; held_at: string; status: string; note: string | null; rsvp_deadline: string | null; rsvp_processed: boolean; }

const STATUS_META: Record<string, { label: string; color: string }> = {
  upcoming:  { label: '예정',   color: 'var(--gold)' },
  active:    { label: '진행중', color: '#4ade80' },
  closed:    { label: '종료',   color: 'var(--white-dim)' },
  cancelled: { label: '취소됨', color: '#f87171' },
};
const ATT_COLOR: Record<string, string> = { attended: '#4ade80', late: '#c9a84c', absent: '#f87171' };
const ATT_LABEL: Record<string, string> = { attended: '출석', late: '지각', absent: '불참' };

const s = {
  label:   { fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.14em', color: 'var(--white-dim)', display: 'block', marginBottom: '0.3rem' } as React.CSSProperties,
  input:   { width: '100%', background: 'rgba(11,34,24,0.8)', border: '1px solid var(--gold-dim)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', padding: '0.6rem 1rem', outline: 'none' } as React.CSSProperties,
  section: { fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.25em', color: 'var(--gold)', marginBottom: '1rem' } as React.CSSProperties,
  micro:   { fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.08em', color: 'rgba(244,239,230,0.28)' } as React.CSSProperties,
};

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function MeetingDetailClient({
  meeting: initialMeeting, players, attendances, rsvps, activeQuarterId, activeQuarterName,
}: {
  meeting: Meeting;
  players: Player[];
  attendances: Attendance[];
  rsvps: RsvpEntry[];
  activeQuarterId: string | null;
  activeQuarterName: string | null;
}) {
  const router = useRouter();
  const [, startT] = useTransition();
  const [tab, setTab] = useState<'rsvp' | 'attendance' | 'settings'>('rsvp');

  // ── 모임 상태 (낙관적 업데이트용) ─────────────────────────────
  const [meetingStatus, setMeetingStatus] = useState(initialMeeting.status);

  // ── 정보 수정 ──────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editNumber, setEditNumber] = useState(String(initialMeeting.number));
  const [editHeldAt, setEditHeldAt] = useState(toLocalInput(initialMeeting.held_at));
  const [editNote, setEditNote] = useState(initialMeeting.note ?? '');
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  async function saveInfo() {
    setEditSaving(true); setEditMsg('');
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_info', meeting_id: initialMeeting.id,
        number: parseInt(editNumber),
        held_at: new Date(editHeldAt).toISOString(),
        note: editNote,
      }),
    });
    setEditSaving(false);
    if (res.ok) { setEditMsg('✓ 저장됨'); setEditing(false); startT(() => router.refresh()); }
    else setEditMsg('오류 발생');
  }

  // ── 상태 변경 ──────────────────────────────────────────────────
  const [statusSaving, setStatusSaving] = useState(false);

  async function changeStatus(newStatus: string) {
    setStatusSaving(true);
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_info', meeting_id: initialMeeting.id, status: newStatus }),
    });
    if (res.ok) { setMeetingStatus(newStatus); startT(() => router.refresh()); }
    setStatusSaving(false);
  }

  // ── 모임 취소 ──────────────────────────────────────────────────
  const [cancelling, setCancelling] = useState(false);

  async function cancelMeeting() {
    if (!confirm(`제${initialMeeting.number}회 모임을 취소하시겠습니까?\n전체 활성 회원에게 취소 알림이 발송됩니다.`)) return;
    setCancelling(true);
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_meeting', meeting_id: initialMeeting.id }),
    });
    if (res.ok) { setMeetingStatus('cancelled'); startT(() => router.refresh()); }
    setCancelling(false);
  }

  // ── 모임 삭제 ──────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(false);

  async function deleteMeeting() {
    const confirmed = confirm(`제${initialMeeting.number}회 모임을 완전히 삭제하시겠습니까?\n⚠ RSVP 투표 및 출석 데이터도 모두 삭제됩니다.`);
    if (!confirmed) return;
    const confirmed2 = confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmed2) return;
    setDeleting(true);
    await fetch('/api/admin/meeting', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: initialMeeting.id }),
    });
    router.push('/admin/meeting');
  }

  // ── RSVP 마감 시간 ─────────────────────────────────────────────
  const [deadlineInput, setDeadlineInput] = useState(toLocalInput(initialMeeting.rsvp_deadline));
  const [deadlineSaving, setDeadlineSaving] = useState(false);
  const [deadlineMsg, setDeadlineMsg] = useState('');

  async function saveDeadline() {
    setDeadlineSaving(true); setDeadlineMsg('');
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_rsvp_deadline', meeting_id: initialMeeting.id, rsvp_deadline: deadlineInput ? new Date(deadlineInput).toISOString() : null }),
    });
    setDeadlineSaving(false);
    setDeadlineMsg(res.ok ? '✓ 저장됨' : '오류 발생');
    if (res.ok) startT(() => router.refresh());
  }

  // ── RSVP 알림 재발송 ───────────────────────────────────────────
  const [notifySending, setNotifySending] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');

  async function resendRsvpNotify() {
    if (!confirm('미투표자 전원에게 참석 투표 알림을 재발송하시겠습니까?')) return;
    setNotifySending(true); setNotifyMsg('');
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend_rsvp_notify', meeting_id: initialMeeting.id }),
    });
    const data = await res.json();
    setNotifyMsg(res.ok ? `✓ ${data.sent}명에게 발송됨` : '오류 발생');
    setNotifySending(false);
  }

  // ── 출석 관리 ──────────────────────────────────────────────────
  const [attMap, setAttMap] = useState<Record<string, { status: 'attended' | 'late' | 'absent'; voted: boolean }>>(() => {
    const m: Record<string, { status: 'attended' | 'late' | 'absent'; voted: boolean }> = {};
    attendances.forEach(a => { m[a.player_id] = { status: a.status, voted: a.voted }; });
    return m;
  });
  const [attSaving, setAttSaving] = useState(false);
  const [attMsg, setAttMsg] = useState('');
  const [autoFilling, setAutoFilling] = useState(false);

  async function saveAttendance() {
    setAttSaving(true); setAttMsg('');
    const list = Object.entries(attMap).map(([player_id, v]) => ({ player_id, ...v }));
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_attendance', meeting_id: initialMeeting.id, attendances: list, quarter_id: activeQuarterId }),
    });
    setAttSaving(false);
    setAttMsg(res.ok ? '✓ 저장됨' : '오류 발생');
    if (res.ok) startT(() => router.refresh());
  }

  async function autoFillFromRsvp() {
    if (!confirm('RSVP 투표 결과를 출석에 자동 적용하시겠습니까?\n참석예정 → 출석, 불참예정 → 불참으로 처리됩니다.')) return;
    setAutoFilling(true);
    const res = await fetch('/api/admin/meeting', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_fill_attendance', meeting_id: initialMeeting.id, quarter_id: activeQuarterId }),
    });
    const data = await res.json();
    if (res.ok) {
      // 로컬 상태 업데이트
      const newMap = { ...attMap };
      rsvps.forEach(r => {
        newMap[r.player_id] = { status: r.status === 'attending' ? 'attended' : 'absent', voted: true };
      });
      setAttMap(newMap);
      setAttMsg(`✓ ${data.filled}명 자동 적용됨`);
      startT(() => router.refresh());
    } else {
      setAttMsg('오류 발생');
    }
    setAutoFilling(false);
  }

  // ── 집계 ───────────────────────────────────────────────────────
  const attending = rsvps.filter(r => r.status === 'attending');
  const absent    = rsvps.filter(r => r.status === 'absent');
  const pmap      = Object.fromEntries(players.map(p => [p.id, p]));
  const rsvpVoted = new Set(rsvps.map(r => r.player_id));
  const unvoted   = players.filter(p => !rsvpVoted.has(p.id));
  const isClosed  = initialMeeting.rsvp_deadline ? new Date(initialMeeting.rsvp_deadline) <= new Date() : false;
  const statusMeta = STATUS_META[meetingStatus] ?? STATUS_META.closed;

  const TABS = [
    { key: 'rsvp' as const,        label: '참석 투표 현황' },
    { key: 'attendance' as const,  label: '출석 관리' },
    { key: 'settings' as const,    label: '모임 설정' },
  ];

  return (
    <div>
      {/* ── 헤더 ── */}
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/admin/meeting" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)', textDecoration: 'none', letterSpacing: '0.12em' }}>← 모임 목록</Link>

        {editing ? (
          /* 편집 모드 */
          <div style={{ marginTop: '1rem', background: 'rgba(30,74,52,0.15)', border: '1px solid rgba(201,168,76,0.2)', padding: '1.5rem' }}>
            <p style={s.section}>모임 정보 수정</p>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
              <div>
                <label style={s.label}>회차</label>
                <input value={editNumber} onChange={e => setEditNumber(e.target.value)} type="number" style={s.input} />
              </div>
              <div>
                <label style={s.label}>날짜·시간</label>
                <input type="datetime-local" value={editHeldAt} onChange={e => setEditHeldAt(e.target.value)} style={s.input} />
              </div>
              <div>
                <label style={s.label}>메모</label>
                <input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="장소, 안내 등" style={s.input} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <button onClick={saveInfo} disabled={editSaving} className="btn-gold" style={{ fontSize: '0.6rem' }}>
                {editSaving ? '저장 중...' : '저장'}
              </button>
              <button onClick={() => setEditing(false)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', background: 'none', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--white-dim)', padding: '0.4rem 0.9rem', cursor: 'pointer' }}>
                취소
              </button>
              {editMsg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: editMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{editMsg}</span>}
            </div>
          </div>
        ) : (
          /* 뷰 모드 */
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.5rem' }}>
            <div>
              <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.8rem', color: meetingStatus === 'cancelled' ? 'rgba(244,239,230,0.35)' : 'var(--foreground)', textDecoration: meetingStatus === 'cancelled' ? 'line-through' : 'none' }}>
                제{editNumber}회 모임
              </h1>
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>
                  {new Date(editHeldAt || initialMeeting.held_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: statusMeta.color, border: `1px solid ${statusMeta.color}`, padding: '0.1rem 0.5rem' }}>
                  {statusMeta.label}
                </span>
                {activeQuarterName && (
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold-dim)', border: '1px solid var(--gold-dim)', padding: '0.1rem 0.5rem' }}>
                    {activeQuarterName}
                  </span>
                )}
              </div>
              {editNote && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.4rem' }}>{editNote}</p>}
            </div>
            <button onClick={() => setEditing(true)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', background: 'none', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold-dim)', padding: '0.4rem 1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ✎ 정보 수정
            </button>
          </div>
        )}
      </div>

      {/* ── 탭 ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(201,168,76,0.12)', marginBottom: '2rem' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em',
            padding: '0.7rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t.key ? 'var(--gold)' : 'var(--white-dim)',
            borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 참석 투표 현황 탭 ── */}
      {tab === 'rsvp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

          {/* 왼쪽: 마감 시간 + 알림 */}
          <div style={{ background: 'rgba(30,74,52,0.12)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem' }}>
            <p style={s.section}>투표 마감 시간</p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>마감 일시</label>
              <input type="datetime-local" value={deadlineInput} onChange={e => setDeadlineInput(e.target.value)} style={s.input} />
              <p style={{ ...s.micro, marginTop: '0.4rem' }}>마감 30분 전 미투표자 알림 · 마감 후 LAPIS -1 차감</p>
            </div>
            {initialMeeting.rsvp_deadline && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: isClosed ? 'rgba(248,113,113,0.06)' : 'rgba(74,222,128,0.06)', border: `1px solid ${isClosed ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}` }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: isClosed ? '#f87171' : '#4ade80', letterSpacing: '0.1em' }}>
                  {isClosed ? '⛔ 마감됨' : '⏱ 진행중'}
                </span>
                {initialMeeting.rsvp_processed && <span style={{ ...s.micro, marginLeft: '0.8rem' }}>LAPIS 처리 완료</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={saveDeadline} disabled={deadlineSaving} className="btn-gold" style={{ fontSize: '0.6rem' }}>
                {deadlineSaving ? '저장 중...' : '저장'}
              </button>
              {deadlineMsg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: deadlineMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{deadlineMsg}</span>}
            </div>

            {/* 알림 재발송 */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
              <p style={{ ...s.micro, marginBottom: '0.6rem' }}>미투표자에게 수동 알림 발송</p>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                <button onClick={resendRsvpNotify} disabled={notifySending} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em', padding: '0.4rem 1rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c', cursor: 'pointer' }}>
                  {notifySending ? '발송 중...' : '알림 재발송'}
                </button>
                {notifyMsg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: notifyMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{notifyMsg}</span>}
              </div>
            </div>
          </div>

          {/* 오른쪽: 투표 현황 */}
          <div style={{ background: 'rgba(30,74,52,0.12)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem' }}>
            <p style={s.section}>투표 현황 ({rsvps.length}/{players.length}명)</p>
            {attending.length > 0 && (
              <div style={{ marginBottom: '1.2rem' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '0.5rem' }}>참석 ({attending.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {attending.map(r => {
                    const p = r.players ?? pmap[r.player_id];
                    return <span key={r.player_id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.2rem 0.6rem', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', background: 'rgba(74,222,128,0.06)' }}>{p?.nickname ?? '?'}</span>;
                  })}
                </div>
              </div>
            )}
            {absent.length > 0 && (
              <div style={{ marginBottom: '1.2rem' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: '#f87171', marginBottom: '0.5rem' }}>불참 ({absent.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {absent.map(r => {
                    const p = r.players ?? pmap[r.player_id];
                    return <span key={r.player_id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.2rem 0.6rem', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', background: 'rgba(248,113,113,0.06)' }}>{p?.nickname ?? '?'}</span>;
                  })}
                </div>
              </div>
            )}
            {unvoted.length > 0 && (
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: 'rgba(244,239,230,0.3)', marginBottom: '0.5rem' }}>
                  미투표 ({unvoted.length}){isClosed ? ' — LAPIS -1 차감 대상' : ''}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {unvoted.map(p => <span key={p.id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.2rem 0.6rem', border: '1px solid rgba(201,168,76,0.1)', color: 'rgba(244,239,230,0.3)' }}>{p.nickname}</span>)}
                </div>
              </div>
            )}
            {rsvps.length === 0 && (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.25)', textAlign: 'center', padding: '1.5rem 0' }}>
                아직 투표한 멤버가 없습니다
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 출석 관리 탭 ── */}
      {tab === 'attendance' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={s.section}>출석 현황 ({Object.values(attMap).filter(a => a.status === 'attended').length}명 출석)</p>
            {rsvps.length > 0 && (
              <button onClick={autoFillFromRsvp} disabled={autoFilling} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em', padding: '0.4rem 1rem', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold-dim)', cursor: 'pointer' }}>
                {autoFilling ? '적용 중...' : 'RSVP → 출석 자동 적용'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '1.5rem' }}>
            {players.map(p => {
              const att = attMap[p.id];
              const status = att?.status ?? null;
              const rsvp = rsvps.find(r => r.player_id === p.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1rem', background: 'rgba(30,74,52,0.1)', borderLeft: `2px solid ${status ? ATT_COLOR[status] : 'rgba(201,168,76,0.1)'}` }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', flex: 1 }}>
                    {p.nickname}
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.4, marginLeft: '0.5rem' }}>@{p.username}</span>
                    {rsvp && (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.42rem', letterSpacing: '0.08em', marginLeft: '0.6rem', padding: '0.05rem 0.35rem', border: `1px solid ${rsvp.status === 'attending' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: rsvp.status === 'attending' ? '#4ade80' : '#f87171' }}>
                        {rsvp.status === 'attending' ? '참석예정' : '불참예정'}
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {(['attended', 'late', 'absent'] as const).map(st => (
                      <button key={st} onClick={() => setAttMap(prev => ({ ...prev, [p.id]: { status: st, voted: prev[p.id]?.voted ?? true } }))}
                        style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.25rem 0.6rem', background: status === st ? `${ATT_COLOR[st]}20` : 'none', border: `1px solid ${status === st ? ATT_COLOR[st] : 'rgba(201,168,76,0.15)'}`, color: status === st ? ATT_COLOR[st] : 'var(--white-dim)', cursor: 'pointer' }}>
                        {ATT_LABEL[st]}
                      </button>
                    ))}
                    <button onClick={() => setAttMap(prev => { const n = { ...prev }; delete n[p.id]; return n; })}
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', padding: '0.25rem 0.6rem', background: !status ? 'rgba(201,168,76,0.08)' : 'none', border: `1px solid ${!status ? 'var(--gold-dim)' : 'rgba(201,168,76,0.1)'}`, color: !status ? 'var(--gold-dim)' : 'rgba(244,239,230,0.2)', cursor: 'pointer' }}>
                      미기록
                    </button>
                  </div>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={saveAttendance} disabled={attSaving} className="btn-gold">
              {attSaving ? '저장 중...' : '출석 저장'}
            </button>
            {attMsg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: attMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{attMsg}</span>}
            {!activeQuarterId && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#fb923c', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>⚠ 활성 분기 없음 — <LapisIcon size={11} /> LAPIS가 분기에 귀속되지 않습니다</span>}
          </div>
        </div>
      )}

      {/* ── 모임 설정 탭 ── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* 상태 변경 */}
          <div style={{ background: 'rgba(30,74,52,0.12)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem' }}>
            <p style={s.section}>상태 변경</p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {(['upcoming', 'active', 'closed'] as const).map(st => {
                const meta = STATUS_META[st];
                return (
                  <button key={st} onClick={() => changeStatus(st)} disabled={statusSaving || meetingStatus === st}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', padding: '0.5rem 1.2rem', background: meetingStatus === st ? `${meta.color}18` : 'none', border: `1px solid ${meetingStatus === st ? meta.color : 'rgba(201,168,76,0.2)'}`, color: meetingStatus === st ? meta.color : 'var(--white-dim)', cursor: meetingStatus === st ? 'default' : 'pointer' }}>
                    {meta.label} {meetingStatus === st && '✓'}
                  </button>
                );
              })}
            </div>
            <p style={{ ...s.micro, marginTop: '0.6rem' }}>현재 상태: <span style={{ color: statusMeta.color }}>{statusMeta.label}</span></p>
          </div>

          {/* 위험 구역 */}
          <div style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.15)', padding: '1.5rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.25em', color: '#f87171', marginBottom: '1rem' }}>위험 구역</p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {/* 모임 취소 */}
              <div>
                <p style={{ ...s.micro, marginBottom: '0.5rem' }}>모임을 취소 상태로 변경하고 전체 알림 발송</p>
                <button onClick={cancelMeeting} disabled={cancelling || meetingStatus === 'cancelled'}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', padding: '0.5rem 1.2rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.35)', color: '#fb923c', cursor: 'pointer' }}>
                  {cancelling ? '처리 중...' : meetingStatus === 'cancelled' ? '이미 취소됨' : '모임 취소'}
                </button>
              </div>

              <div style={{ width: 1, background: 'rgba(248,113,113,0.15)', alignSelf: 'stretch' }} />

              {/* 완전 삭제 */}
              <div>
                <p style={{ ...s.micro, marginBottom: '0.5rem' }}>모든 데이터를 영구 삭제 (복구 불가)</p>
                <button onClick={deleteMeeting} disabled={deleting}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', padding: '0.5rem 1.2rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', cursor: 'pointer' }}>
                  {deleting ? '삭제 중...' : '모임 삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
