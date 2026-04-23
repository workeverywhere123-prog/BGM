import Nav from '../../nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const CATEGORY_LABEL: Record<string, string> = {
  important: '중요', rule: '규칙', event: '이벤트', general: '일반',
};

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: notice } = await supabase
    .from('notices')
    .select('id, title, content, category, is_pinned, created_at, updated_at, players(nickname, username)')
    .eq('id', id)
    .maybeSingle();

  if (!notice) notFound();

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '6rem 2rem 6rem' }}>
        <Link href="/notice" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textDecoration: 'none' }}>
          ← 공지사항 목록
        </Link>

        <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', alignItems: 'center' }}>
            {notice.is_pinned && (
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.15rem 0.5rem' }}>고정</span>
            )}
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--white-dim)', border: '1px solid rgba(244,239,230,0.2)', padding: '0.15rem 0.5rem' }}>
              {CATEGORY_LABEL[notice.category] ?? notice.category}
            </span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: 'var(--foreground)', lineHeight: 1.3 }}>{notice.title}</h1>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.8rem' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--white-dim)' }}>{(notice.players as any)?.nickname}</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--white-dim)', opacity: 0.6 }}>{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, var(--gold-dim), transparent)', marginBottom: '2.5rem' }} />

        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', lineHeight: 1.9, color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}>
          {notice.content}
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
