import Nav from '../../nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Footer from '../../footer';
import MeetingRsvpSection from '@/components/MeetingRsvpSection';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, number, held_at, status, note, rsvp_deadline')
    .eq('id', id)
    .maybeSingle();

  if (!meeting) notFound();

  // RSVP 목록 조회
  const { data: rsvps } = await supabase
    .from('meeting_rsvps')
    .select('player_id, status, players(id, nickname, username, avatar_url)')
    .eq('meeting_id', id);

  let currentUserId: string | null = null;
  try { const u = await getSessionUser(); currentUserId = u?.id ?? null; } catch {}

  const d = new Date(meeting.held_at);
  const STATUS_COLOR: Record<string, string> = { upcoming: 'var(--gold)', active: '#4ade80', closed: 'var(--white-dim)' };
  const STATUS_LABEL: Record<string, string> = { upcoming: '예정', active: '진행중', closed: '종료' };
  const st = STATUS_LABEL[meeting.status] ?? '예정';
  const stColor = STATUS_COLOR[meeting.status] ?? 'var(--gold)';

  const attending = (rsvps ?? []).filter(r => r.status === 'attending');
  const absent    = (rsvps ?? []).filter(r => r.status === 'absent');
  const myRsvp    = currentUserId ? (rsvps ?? []).find(r => r.player_id === currentUserId) : null;

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 2rem 6rem' }}>

          {/* 뒤로 */}
          <Link href="/rooms" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
            ← 모임일정
          </Link>

          {/* 헤더 */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: stColor, border: `1px solid ${stColor}44`, padding: '0.1rem 0.5rem' }}>
                {st}
              </span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--gold-dim)' }}>
                제{meeting.number}회 정기 모임
              </span>
            </div>
            <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: 'var(--foreground)', lineHeight: 1.1, margin: '0 0 0.5rem' }}>
              {d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </h1>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.15em', color: 'var(--gold)' }}>
              {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {meeting.note && (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.5rem' }}>
                {meeting.note}
              </p>
            )}
          </div>

          <div style={{ width: 80, height: 1, background: 'linear-gradient(to right, transparent, var(--gold), transparent)', marginBottom: '2.5rem' }} />

          {/* 참석 투표 (클라이언트 컴포넌트) */}
          <MeetingRsvpSection
            meetingId={id}
            currentUserId={currentUserId}
            rsvpDeadline={meeting.rsvp_deadline ?? null}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialAttending={attending as any[]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialAbsent={absent as any[]}
            initialMyStatus={myRsvp?.status ?? null}
          />

        </div>
      </div>
      <Footer />
    </>
  );
}
