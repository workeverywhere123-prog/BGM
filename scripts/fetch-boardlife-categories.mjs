// 보드라이프에서 카테고리 가져와서 player_games.genre 업데이트
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://khvkuowhnavsaorgjpyo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = 'https://boardlife.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const SLUG_TO_KO = {
  strategy: '전략', abstract: '추상', customizable: '커스터마이즈',
  family: '가족', children: '아동', party: '파티', thematic: '테마', war: '전쟁',
};

async function fetchCategories(boardlife_id) {
  try {
    const res = await fetch(`${BASE}/game/${boardlife_id}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const slugs = [...html.matchAll(/rank\/all\/([a-z]+)\/\d+\?game_id=\d+/g)]
      .map(m => m[1]).filter(s => SLUG_TO_KO[s]);
    const unique = [...new Set(slugs)];
    return unique.length ? unique.map(s => SLUG_TO_KO[s]).join(',') : null;
  } catch {
    return null;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!SUPABASE_SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY 필요'); process.exit(1); }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: games } = await supabase
    .from('player_games')
    .select('id, name, boardlife_id, genre')
    .not('boardlife_id', 'is', null)
    .order('name');

  console.log(`\n총 ${games?.length ?? 0}개 게임 카테고리 업데이트 시작...\n`);
  let updated = 0, nocat = 0, err = 0;

  for (let i = 0; i < (games ?? []).length; i++) {
    const g = games[i];
    process.stdout.write(`[${i+1}/${games.length}] ${g.name} ... `);

    const genre = await fetchCategories(g.boardlife_id);
    if (!genre) {
      console.log('카테고리 없음');
      nocat++;
      await sleep(300);
      continue;
    }

    const { error } = await supabase.from('player_games')
      .update({ genre })
      .eq('id', g.id);

    if (error) {
      console.log(`⚠ ${error.message}`);
      err++;
    } else {
      console.log(`✓ ${genre}`);
      updated++;
    }
    await sleep(400);
  }

  console.log(`\n완료: 업데이트 ${updated} / 카테고리 없음 ${nocat} / 오류 ${err}`);
}

main();
