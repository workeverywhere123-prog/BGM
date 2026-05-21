import Nav from '../nav';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import Footer from '../footer';
import LapisIcon from '@/components/LapisIcon';
import MeetingPollSection from '@/components/MeetingPollSection';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  upcoming: { label: '예정', color: 'var(--gold)' },
  active:   { label: '진행중', color: '#4ade80' },
  closed:   { label: '종료', color: 'var(--white-dim)' },
};

async function getUpcomingMeetings() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('meetings')
      .select('id, number, held_at, status, note')
      .in('status', ['upcoming', 'active'])
      .order('held_at', { ascending: true })
      .limit(3);
    return data ?? [];
  } catch { return []; }
}

async function getPastMeetings() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('meetings')
      .select('id, number, held_at, status, note')
      .order('held_at', { ascending: false })
      .limit(50);
    return data ?? [];
  } catch { return []; }
}

export default async function MeetingPage() {
  const configured = isSupabaseConfigured();

  const [resolvedUser, upcomingMeetings, pastMeetings] = await Promise.all([
    configured ? getSessionUser().catch(() => null) : Promise.resolve(null),
    configured ? getUpcomingMeetings() : Promise.resolve([]),
    configured ? getPastMeetings() : Promise.resolve([]),
  ]);

  const currentUserId = resolvedUser?.id ?? null;

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="page-container" style={{ maxWidth: 760, margin: '0 auto', padding: '2rem clamp(1rem, 4vw, 2rem) 6rem' }}>

          {/* 정기 모임 + 투표 */}
          {configured && (
            <MeetingPollSection
              currentUserId={currentUserId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              upcomingMeetings={upcomingMeetings as any[]}
            />
          )}

          {/* HOW TO PLAY LAPIS */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <LapisIcon size={11} /> HOW TO PLAY — LAPIS
              </p>
              <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
            </div>
            <div className="lapis-grid" style={{ marginBottom: '1rem' }}>
              {[
                { icon: '🎮', label: '경기 참가', desc: '매 게임에 참가하면 LAPIS 적립' },
                { icon: '🏆', label: '순위 성과', desc: '상위 순위일수록 더 많은 LAPIS' },
                { icon: '⭐', label: 'MVP 선정', desc: 'MVP로 선정되면 추가 LAPIS' },
                { icon: '📅', label: '모임 출석', desc: '정기 모임 참석 시 LAPIS 적립' },
              ].map(item => (
                <div key={item.label} style={{ padding: '0.9rem 1rem', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.04)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em', color: 'var(--gold)' }}>{item.label}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.82rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.7 }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <Link href="/notice?tab=rules" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em',
              color: 'var(--gold-dim)', textDecoration: 'none',
              border: '1px solid rgba(201,168,76,0.18)', padding: '0.4rem 1rem',
            }}>
              ◆ 전체 규칙 보기 →
            </Link>
          </div>

          {/* MEETING HISTORY */}
          {pastMeetings.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>
                  MEETING HISTORY
                </p>
                <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
              </div>
              <div className="thin-scroll" style={{ maxHeight: '40vh', overflowY: 'scroll', paddingRight: '0.4rem' }}>
                <div className="events-list">
                  {(pastMeetings as { id: string; number: number; held_at: string; status: string; note: string | null }[]).map(m => {
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
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}
