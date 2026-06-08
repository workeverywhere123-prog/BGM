import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RecordForm } from './RecordForm';

// BGM 리그 ID는 환경변수 또는 DB에서 첫 번째 리그를 사용
// (운영자가 하나의 리그만 운영하는 단순 구조)
async function getLeagueData() {
  const supabase = await createSupabaseServerClient();

  // 첫 번째 리그 (BGM 단일 모임)
  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (!league) return null;

  // 플레이어 목록 (활성 유저)
  const { data: players } = await supabase
    .from('players')
    .select('id, username, nickname')
    .eq('is_active', true)
    .order('nickname');

  // 최근 모임 (최근 20회)
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, number, held_at')
    .eq('league_id', league.id)
    .order('number', { ascending: false })
    .limit(20);

  return {
    leagueId: league.id,
    players: players ?? [],
    meetings: meetings ?? [],
  };
}

export default async function RecordPage() {
  const data = await getLeagueData();

  if (!data) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>ADMIN</p>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)' }}>경기 기록</h1>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.05)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: '0.4rem' }}>리그가 없습니다</p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', opacity: 0.7, marginBottom: '0.75rem' }}>
            먼저 Supabase에서 리그를 생성하거나 아래 SQL을 실행하세요
          </p>
          <pre style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', color: 'var(--gold-dim)', overflowX: 'auto' }}>
{`INSERT INTO public.leagues (name, slug, owner_id, is_public)\nVALUES ('BGM Melbourne', 'bgm-melbourne', auth.uid(), true);`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>ADMIN</p>
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', lineHeight: 1 }}>경기 기록</h1>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.45, marginTop: '0.4rem', letterSpacing: '0.08em' }}>
          게임 결과를 입력하면 칩이 자동 계산됩니다
        </p>
      </div>
      <RecordForm
        players={data.players}
        meetings={data.meetings}
        leagueId={data.leagueId}
      />
    </div>
  );
}
