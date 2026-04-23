import Nav from '../nav';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';

import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getMeetings() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('meetings')
      .select('id, number, held_at, status, note')
      .order('number', { ascending: false })
      .limit(30);
    return data ?? [];
  } catch { return []; }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  upcoming: { label: '예정', color: 'var(--gold)' },
  active:   { label: '진행중', color: '#4ade80' },
  closed:   { label: '종료', color: 'var(--white-dim)' },
};

export default async function MeetingPage() {
  const configured = isSupabaseConfigured();
  const meetings = configured ? await getMeetings() : [];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="bgm-section" style={{ paddingBottom: '2rem', textAlign: 'center' }}>
          <p className="section-label">정기 모임</p>
          <h1 className="section-title">모임 일정</h1>
          <div className="section-divider" />
          <Link href="/rules" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.18em',
            color: 'var(--gold-dim)', textDecoration: 'none',
            border: '1px solid rgba(201,168,76,0.2)', padding: '0.5rem 1.2rem',
            marginTop: '0.5rem',
          }}>
            ◆ HOW TO PLAY — 포인트 규칙 보기
          </Link>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 2rem 6rem' }}>
          {meetings.length === 0 ? (
            <div className="board-empty"><p>등록된 모임이 없습니다</p></div>
          ) : (
            <div className="events-list">
              {meetings.map((m: { id: string; number: number; held_at: string; status: string; note: string | null }) => {
                const d = new Date(m.held_at);
                const st = STATUS_LABEL[m.status] ?? STATUS_LABEL.closed;
                return (
                  <Link href={`/meeting/${m.id}`} key={m.id} className="event-item" style={{ textDecoration: 'none' }}>
                    <div className="event-date">
                      <div className="event-day">{d.getDate()}</div>
                      <div className="event-month">{d.toLocaleDateString('ko-KR', { month: 'short' }).replace('월', 'M')}</div>
                    </div>
                    <div className="event-info">
                      <h4>제{m.number}회 모임</h4>
                      <p>{m.note ?? d.toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="event-badge" style={{ borderColor: st.color, color: st.color }}>
                      {st.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne.</div>
        <div className="footer-links"><a href="#">인스타그램</a><a href="#">디스코드</a></div>
      </footer>
    </>
  );
}
