import Nav from '../nav';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getNotices() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('notices')
      .select('id, title, category, is_pinned, created_at, players(nickname)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch { return []; }
}

const CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  important: { label: '중요', color: '#ff6464' },
  rule:      { label: '규칙', color: 'var(--gold)' },
  event:     { label: '이벤트', color: '#4ade80' },
  general:   { label: '일반', color: 'var(--white-dim)' },
};

export default async function NoticePage() {
  const configured = isSupabaseConfigured();
  const notices = configured ? await getNotices() : [];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="bgm-section" style={{ paddingBottom: '2rem', textAlign: 'center' }}>
          <p className="section-label">안내</p>
          <h1 className="section-title">공지사항</h1>
          <div className="section-divider" />
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 2rem 6rem' }}>
          {notices.length === 0 ? (
            <div className="board-empty"><p>등록된 공지가 없습니다</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(notices as any[]).map((n) => {
                const cat = CATEGORY_LABEL[n.category] ?? CATEGORY_LABEL.general;
                return (
                  <Link href={`/notice/${n.id}`} key={n.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem',
                    padding: '1.2rem 1.8rem', textDecoration: 'none',
                    background: n.is_pinned ? 'rgba(201,168,76,0.06)' : 'rgba(30,74,52,0.12)',
                    borderLeft: `2px solid ${n.is_pinned ? 'var(--gold)' : 'var(--gold-dim)'}`,
                    transition: 'all 0.3s',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                        {n.is_pinned && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.1rem 0.4rem' }}>고정</span>}
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: cat.color, border: `1px solid ${cat.color}`, padding: '0.1rem 0.4rem', opacity: 0.8 }}>{cat.label}</span>
                      </div>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--foreground)' }}>{n.title}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>
                        {n.players?.nickname}
                      </div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--white-dim)', opacity: 0.6, marginTop: '0.2rem' }}>
                        {new Date(n.created_at).toLocaleDateString('ko-KR')}
                      </div>
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
