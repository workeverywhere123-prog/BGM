import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import LapisIcon from '@/components/LapisIcon';

async function getLapisRanking() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_chip_totals')
      .select('player_id, total_chips')
      .order('total_chips', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return [];

    const ids = data.map((r: { player_id: string }) => r.player_id);
    const { data: playerData } = await supabase
      .from('players')
      .select('id, nickname, username')
      .in('id', ids);

    const playerMap = Object.fromEntries(
      (playerData ?? []).map((p: { id: string; nickname: string; username: string }) => [p.id, p])
    );

    return data.map((r: { player_id: string; total_chips: number }, i: number) => ({
      rank: i + 1, ...playerMap[r.player_id], total_chips: r.total_chips,
    }));
  } catch { return []; }
}

const PAST_CHAMPIONS: { season: string; champion: string; lapis: number }[] = [];
const MEDAL = ['🥇', '🥈', '🥉'];

export default async function LeaderboardContent({ hideLapis = false, hideChampions = false }: { hideLapis?: boolean; hideChampions?: boolean }) {
  const configured = isSupabaseConfigured();
  const ranking = (!hideLapis && configured) ? await getLapisRanking() : [];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 1.5rem 6rem', display: 'flex', flexDirection: 'column', gap: '4rem' }}>

      {/* LAPIS 현재 순위 */}
      {!hideLapis && <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <LapisIcon size={12} /> LAPIS RANKING — CURRENT SEASON
          </p>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
        </div>

        <div style={{ marginBottom: '0.8rem', padding: '0.6rem 1.5rem', display: 'grid', gridTemplateColumns: '3rem 1fr 7rem', fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>
          <span>RANK</span><span>PLAYER</span><span style={{ textAlign: 'right', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}><LapisIcon size={11} /> LAPIS</span>
        </div>

        {ranking.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
            아직 기록된 <LapisIcon size={14} /> LAPIS가 없습니다
          </div>
        ) : (ranking as { rank: number; nickname: string; username: string; total_chips: number }[]).map((entry, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '3rem 1fr 7rem',
            alignItems: 'center', padding: '1rem 1.5rem',
            border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.4)' : i === 1 ? 'rgba(180,180,190,0.25)' : i === 2 ? 'rgba(180,130,80,0.25)' : 'rgba(201,168,76,0.08)'}`,
            background: i === 0 ? 'rgba(201,168,76,0.07)' : i < 3 ? 'rgba(201,168,76,0.03)' : 'rgba(30,74,52,0.08)',
            marginBottom: '0.4rem',
          }}>
            <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: i < 3 ? '1.1rem' : '0.8rem', color: i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c8' : i === 2 ? '#cd7f32' : 'var(--white-dim)', opacity: i >= 3 ? 0.6 : 1 }}>
              {i < 3 ? MEDAL[i] : entry.rank}
            </span>
            <Link href={`/profile/${entry.username}`} style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: i < 3 ? '1.25rem' : '1.1rem', color: i === 0 ? 'var(--gold)' : 'var(--foreground)', fontWeight: i === 0 ? 600 : 400 }}>
                {entry.nickname}
              </span>
              {i === 0 && (
                <span style={{ marginLeft: '0.6rem', fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.15em', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.4)', padding: '0.1rem 0.4rem', verticalAlign: 'middle' }}>
                  LEADER
                </span>
              )}
            </Link>
            <span style={{ textAlign: 'right', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel Decorative', serif", fontSize: i < 3 ? '1.1rem' : '0.95rem', color: i === 0 ? 'var(--gold)' : i < 3 ? 'var(--gold-dim)' : 'var(--white-dim)', justifyContent: 'flex-end' }}>
              <LapisIcon size={i < 3 ? 16 : 13} />
              {entry.total_chips > 0 ? '+' : ''}{entry.total_chips}
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', opacity: 0.55 }}>LAPIS</span>
            </span>
          </div>
        ))}

        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.12em', color: 'rgba(244,239,230,0.3)', textAlign: 'right', marginTop: '0.6rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><LapisIcon size={10} /> LAPIS는 게임 참가·출석·성과로 적립됩니다</span>
        </p>
      </section>}

      {/* 역대 리그 우승자 */}
      {!hideChampions && <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>
            LEAGUE CHAMPIONS — ALL TIME
          </p>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
        </div>

        {PAST_CHAMPIONS.length === 0 ? (
          <div style={{ padding: '3rem 2rem', border: '1px solid rgba(201,168,76,0.1)', background: 'rgba(30,74,52,0.08)', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.5rem', color: 'rgba(201,168,76,0.2)', marginBottom: '0.8rem' }}>✦</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
              첫 번째 리그 챔피언의 이름이<br/>이곳에 영원히 새겨질 것입니다.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {PAST_CHAMPIONS.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', padding: '1.2rem 1.5rem', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.04)' }}>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>{c.season}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', color: 'var(--gold)' }}>🏆 {c.champion}</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontFamily: "'Cinzel Decorative', serif", fontSize: '1rem', color: 'var(--gold-dim)' }}><LapisIcon size={14} />{c.lapis} LAPIS</span>
              </div>
            ))}
          </div>
        )}
      </section>}

    </div>
  );
}
