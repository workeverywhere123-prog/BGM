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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">경기 기록</h1>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-200">
          <p className="font-medium">리그가 없습니다</p>
          <p className="mt-1 opacity-80">
            먼저 Supabase에서 리그를 생성하거나 아래 SQL을 실행하세요:
          </p>
          <pre className="mt-2 rounded bg-black/30 p-3 text-xs font-mono overflow-x-auto">
{`INSERT INTO public.leagues (name, slug, owner_id, is_public)
VALUES ('BGM Melbourne', 'bgm-melbourne', auth.uid(), true);`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">경기 기록</h1>
        <p className="mt-1 text-sm opacity-50">게임 결과를 입력하면 칩이 자동 계산됩니다</p>
      </div>
      <RecordForm
        players={data.players}
        meetings={data.meetings}
        leagueId={data.leagueId}
      />
    </div>
  );
}
