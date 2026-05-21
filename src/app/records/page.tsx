import { Suspense } from 'react';
import Nav from '../nav';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import Footer from '../footer';
import LapisIcon from '@/components/LapisIcon';
import { RANK_COLOR, RANK_SYMBOL, DEFAULT_LOOKBACK_DAYS } from '@/lib/constants';
import RecordsFilter from './RecordsFilter';
import MatchList from './MatchList';
import StatsContent from './StatsContent';
import HoldingsRankingClient from './HoldingsRankingClient';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'records', label: '기록실' },
  { id: 'stats', label: '분석실' },
];

const TAB_META: Record<string, { desc: string }> = {
  records: { desc: 'BGM의 모든 경기 기록을 열람합니다' },
  stats:   { desc: '플레이 데이터와 통계를 분석합니다' },
};

function TabSkeleton() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[80, 60, 90, 55, 70].map((w, i) => (
        <div key={i} style={{ height: 48, background: 'rgba(201,168,76,0.06)', borderRadius: 2, width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span style={{
      fontFamily: "'Cinzel', serif",
      fontSize: rank <= 3 ? '1.2rem' : '1rem',
      width: 28, textAlign: 'center' as const, display: 'inline-block',
      color: rank <= 3 ? RANK_COLOR[rank - 1] : 'rgba(244,239,230,0.3)',
    }}>
      {rank <= 3 ? RANK_SYMBOL[rank - 1] : rank}
    </span>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '3rem 0 1.5rem' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>{label}</p>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
    </div>
  );
}

function TabBar({ activeTab }: { activeTab: string }) {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 2rem' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.15)', marginBottom: '3rem', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <Link key={tab.id} href={`/records?tab=${tab.id}`} style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.2em',
            padding: '0.9rem 2rem', textDecoration: 'none', whiteSpace: 'nowrap',
            color: activeTab === tab.id ? 'var(--gold)' : 'rgba(244,239,230,0.4)',
            borderBottom: `2px solid ${activeTab === tab.id ? 'var(--gold)' : 'transparent'}`,
            marginBottom: '-1px', transition: 'color 0.2s',
          }}>
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

type SearchParams = Promise<{ tab?: string; quarter?: string; player?: string; game?: string; from?: string; to?: string }>;

export default async function RecordsHubPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const activeTab = TABS.find(t => t.id === params.tab)?.id ?? 'records';
  const meta = TAB_META[activeTab];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', padding: '3rem 2rem 1.5rem' }}>
          <p className="section-label">BGM CHRONICLES</p>
          <h1 className="section-title">기록 전당</h1>
          <div className="section-divider" />
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic',
            marginTop: '0.5rem', opacity: 0.75,
          }}>
            {meta.desc}
          </p>
        </div>

        <TabBar activeTab={activeTab} />

        {activeTab === 'records' && <RecordsTab params={params as { quarter?: string; player?: string; game?: string; from?: string; to?: string }} />}
        {activeTab === 'stats' && (
          <Suspense fallback={<TabSkeleton />}>
            <StatsContent />
          </Suspense>
        )}

      </div>
      <Footer />
    </>
  );
}

async function RecordsTab({ params }: { params: { quarter?: string; player?: string; game?: string; from?: string; to?: string } }) {
  const quarterFilter = params.quarter ?? '';
  const playerFilter = params.player ?? '';
  const gameFilter = params.game ?? '';
  const fromFilter = params.from ?? '';
  const toFilter = params.to ?? '';

  const configured = isSupabaseConfigured();
  if (!configured) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 6rem' }}>
        <div className="board-empty"><p>설정이 필요합니다</p></div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const [
    { data: allQuarters },
    { data: allPlayersRaw },
    { data: gameNamesRaw },
    { data: qData },
    { data: holdingsData },
  ] = await Promise.all([
    supabase.from('quarters').select('id, name, is_active, started_at, ended_at').order('started_at', { ascending: false }),
    supabase.from('players').select('id, nickname, username').order('nickname'),
    supabase.from('matches').select('boardlife_game_name').not('boardlife_game_name', 'is', null),
    supabase.from('player_active_quarter_totals').select('player_id, quarter_points, gains, losses'),
    supabase.from('player_chip_totals').select('player_id, total_chips').order('total_chips', { ascending: false }).limit(200),
  ]);

  const activeQuarter = (allQuarters ?? []).find(q => q.is_active) ?? null;
  const allPlayers = (allPlayersRaw ?? []) as { id: string; nickname: string; username: string }[];
  const gameNames = [...new Set((gameNamesRaw ?? []).map(m => m.boardlife_game_name).filter(Boolean))] as string[];
  gameNames.sort();

  const allPlayerMap = Object.fromEntries((allPlayersRaw ?? []).map(p => [p.id, p]));

  type QRankEntry = { id?: string; nickname?: string; username?: string; quarter_points: number; gains: number; losses: number; rank: number };
  const quarterRanking: QRankEntry[] = (activeQuarter && qData?.length)
    ? (qData as { player_id: string; quarter_points: number; gains: number; losses: number }[])
        .map(r => ({ ...allPlayerMap[r.player_id], quarter_points: r.quarter_points, gains: r.gains, losses: r.losses }))
        .sort((a, b) => b.quarter_points - a.quarter_points)
        .map((r, i) => ({ ...r, rank: i + 1 })) as QRankEntry[]
    : [];

  const holdings: { id?: string; nickname?: string; username?: string; total_chips: number; rank: number }[] =
    (holdingsData ?? []).map((r: { player_id: string; total_chips: number }, i: number) => ({
      rank: i + 1, ...allPlayerMap[r.player_id], total_chips: r.total_chips,
    }));

  let since: string | null = null;
  let until: string | null = null;
  let periodLabel = '';

  if (fromFilter || toFilter) {
    since = fromFilter ? new Date(fromFilter).toISOString() : null;
    until = toFilter ? new Date(toFilter + 'T23:59:59').toISOString() : null;
    periodLabel = `${fromFilter || '—'} ~ ${toFilter || '현재'}`;
  } else if (quarterFilter === 'all') {
    periodLabel = '전체 기간';
  } else if (quarterFilter) {
    const qtr = (allQuarters ?? []).find(q => q.id === quarterFilter);
    if (qtr) {
      since = qtr.started_at;
      until = qtr.ended_at;
      periodLabel = qtr.name;
    }
  } else {
    if (activeQuarter?.started_at) {
      since = new Date(activeQuarter.started_at).toISOString();
      periodLabel = `${activeQuarter.name} 기간`;
    } else {
      since = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
      periodLabel = `최근 ${DEFAULT_LOOKBACK_DAYS}일`;
    }
  }

  let allowedMatchIds: string[] | null = null;
  if (playerFilter) {
    const { data: playerParts } = await supabase
      .from('match_participants')
      .select('match_id')
      .eq('player_id', playerFilter);
    allowedMatchIds = (playerParts ?? []).map(p => p.match_id);
  }

  const dropdownQuarters = (allQuarters ?? []).filter(q => !q.is_active);
  const totalLabel = `${periodLabel} — `;

  if (allowedMatchIds !== null && allowedMatchIds.length === 0) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 6rem' }}>
        <SectionDivider label="LAPIS RECORDS — 분기 & 누적" />
        <RankingGridSection activeQuarter={activeQuarter} quarterRanking={quarterRanking} holdings={holdings} />
        <SectionDivider label="MATCH HISTORY — 경기 기록" />
        <Suspense fallback={null}>
          <RecordsFilter quarters={dropdownQuarters} players={allPlayers} gameNames={gameNames} activeQuarterName={activeQuarter?.name} fromValue={fromFilter} toValue={toFilter} />
        </Suspense>
        <MatchList matches={[]} pmap={{}} totalLabel={`${periodLabel} — 0경기`} />
      </div>
    );
  }

  let matchQuery = supabase
    .from('matches')
    .select('id, game_type, played_at, is_ranked, boardlife_game_name, note')
    .order('played_at', { ascending: false })
    .limit(300);

  if (since) matchQuery = matchQuery.gte('played_at', since);
  if (until) matchQuery = matchQuery.lte('played_at', until);
  if (gameFilter) matchQuery = matchQuery.eq('boardlife_game_name', gameFilter);
  if (allowedMatchIds !== null) matchQuery = matchQuery.in('id', allowedMatchIds);

  const { data: rawMatches } = await matchQuery;
  const matchIds = (rawMatches ?? []).map(m => m.id);

  let rawParticipants: {
    match_id: string; player_id: string; rank: number | null; team: string | null;
    role: string | null; is_winner: boolean; is_mvp: boolean; score: number | null;
    chip_change: number | null;
  }[] = [];

  if (matchIds.length) {
    const { data: parts } = await supabase
      .from('match_participants')
      .select('match_id, player_id, rank, team, role, is_winner, is_mvp, score, chip_change')
      .in('match_id', matchIds);
    rawParticipants = (parts ?? []) as typeof rawParticipants;
  }

  const partsByMatch: Record<string, typeof rawParticipants> = {};
  for (const p of rawParticipants) {
    if (!partsByMatch[p.match_id]) partsByMatch[p.match_id] = [];
    partsByMatch[p.match_id].push(p);
  }

  const matches = (rawMatches ?? []).map(m => ({ ...m, match_participants: partsByMatch[m.id] ?? [] }));

  const allPlayerIds = [...new Set(rawParticipants.map(p => p.player_id))];
  let pmap: Record<string, { id: string; nickname: string; username: string }> = {};
  if (allPlayerIds.length) {
    const { data: mPlayers } = await supabase.from('players').select('id, nickname, username').in('id', allPlayerIds);
    pmap = Object.fromEntries((mPlayers ?? []).map(p => [p.id, p]));
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 6rem' }}>
      {activeQuarter && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', textAlign: 'center', marginBottom: '1rem' }}>
          {activeQuarter.name} 진행 중
        </p>
      )}

      <SectionDivider label="LAPIS RECORDS — 분기 & 누적" />
      <RankingGridSection activeQuarter={activeQuarter} quarterRanking={quarterRanking} holdings={holdings} />

      <SectionDivider label="MATCH HISTORY — 경기 기록" />
      <Suspense fallback={null}>
        <RecordsFilter quarters={dropdownQuarters} players={allPlayers} gameNames={gameNames} activeQuarterName={activeQuarter?.name} fromValue={fromFilter} toValue={toFilter} />
      </Suspense>
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
        <MatchList matches={matches} pmap={pmap} totalLabel={`${periodLabel} — ${matches.length}경기`} />
      </div>
    </div>
  );
}

function RankingGridSection({
  activeQuarter,
  quarterRanking,
  holdings,
}: {
  activeQuarter: { id: string; name: string; started_at: string; ended_at: string; is_active: boolean } | null;
  quarterRanking: { id?: string; nickname?: string; username?: string; quarter_points: number; gains: number; losses: number; rank: number }[];
  holdings: { id?: string; nickname?: string; username?: string; total_chips: number; rank: number }[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>
            {activeQuarter ? `${activeQuarter.name} 랭킹` : '이번 분기 랭킹'}
          </p>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5 }}>분기 초기화 반영</span>
        </div>
        {!activeQuarter ? (
          <div className="board-empty"><p>활성 분기가 없습니다</p></div>
        ) : quarterRanking.length === 0 ? (
          <div className="board-empty"><p>이번 분기 기록이 없습니다</p></div>
        ) : (
          <div style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '0.8rem', padding: '0.6rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
              <span>#</span><span>플레이어</span><span style={{ textAlign: 'center' }}>게임수</span>
              <span style={{ textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                <LapisIcon size={11} /> LAPIS
              </span>
            </div>
            {quarterRanking.map((e, i) => (
              <Link href={`/profile/${e.username ?? ''}`} key={e.id ?? i} style={{
                display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '0.8rem',
                alignItems: 'center', padding: '0.9rem 1.2rem', textDecoration: 'none',
                borderTop: '1px solid rgba(201,168,76,0.07)',
                borderLeft: i < 3 ? `2px solid ${RANK_COLOR[i]}` : '2px solid transparent',
                background: i === 0 ? 'rgba(201,168,76,0.08)' : 'transparent',
              }}>
                <RankBadge rank={e.rank} />
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{e.nickname}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', textAlign: 'center', color: 'var(--white-dim)' }}>
                  {(e.gains ?? 0) + (e.losses ?? 0)}
                </span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.95rem', textAlign: 'center', color: e.quarter_points >= 0 ? 'var(--gold)' : '#ff8888', fontWeight: 600 }}>
                  {e.quarter_points > 0 ? '+' : ''}{e.quarter_points}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <HoldingsRankingClient holdings={holdings} />
    </div>
  );
}
