import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RecordForm } from './RecordForm';
import MatchList from './MatchList';

const GAME_TYPE_KR: Record<string, string> = {
  team: '팀전', mafia: '마피아', deathmatch: '데스매치',
  onevsmany: '1vs多', coop: '협력', ranking: '순위게임',
};

async function getData() {
  const supabase = await createSupabaseServerClient();

  const { data: league } = await supabase
    .from('leagues').select('id').limit(1).maybeSingle();

  if (!league) return null;

  const [
    { data: players },
    { data: meetings },
    { data: matches },
  ] = await Promise.all([
    supabase.from('players').select('id, username, nickname').eq('is_active', true).order('nickname'),
    supabase.from('meetings')
      .select('id, number, held_at')
      .eq('league_id', league.id)
      .order('number', { ascending: false })
      .limit(20),
    supabase.from('matches')
      .select(`
        id, game_type, played_at, note,
        meetings(number, held_at),
        match_participants(
          player_id, chip_change, is_winner, team, role, rank, is_mvp,
          players(nickname)
        )
      `)
      .order('played_at', { ascending: false })
      .limit(50),
  ]);

  return {
    leagueId: league.id,
    players: players ?? [],
    meetings: meetings ?? [],
    matches: matches ?? [],
  };
}

export default async function RecordPage() {
  const data = await getData();

  if (!data) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>ADMIN</p>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)' }}>경기 기록 관리</h1>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.05)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)' }}>리그가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>ADMIN</p>
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)', lineHeight: 1 }}>경기 기록 관리</h1>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.45, marginTop: '0.4rem', letterSpacing: '0.08em' }}>
          총 {data.matches.length}건 · 게임 결과 기록 및 삭제
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>

        {/* 왼쪽: 기록 목록 */}
        <div>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.22em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>경기 기록 목록</p>
          <MatchList
            matches={(data.matches as unknown as MatchRaw[])}
            gameTypeKr={GAME_TYPE_KR}
          />
        </div>

        {/* 오른쪽: 새 경기 기록 폼 */}
        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.22em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>새 경기 기록</p>
          <RecordForm
            players={data.players}
            meetings={data.meetings}
            leagueId={data.leagueId}
          />
        </div>

      </div>
    </div>
  );
}

// 타입 (서버 컴포넌트에서만 사용)
type MatchRaw = {
  id: string;
  game_type: string;
  played_at: string;
  note: string | null;
  meetings: { number: number; held_at: string } | null;
  match_participants: {
    player_id: string;
    chip_change: number;
    is_winner: boolean | null;
    team: string | null;
    role: string | null;
    rank: number | null;
    is_mvp: boolean;
    players: { nickname: string } | null;
  }[];
};
