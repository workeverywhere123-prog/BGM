// 2차 - 실패한 게임 재시도 + 누락된 게임 추가
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://khvkuowhnavsaorgjpyo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLAYER_ID = '7fff8515-8484-435a-bc8a-af1b02fc43e1';
const BASE = 'https://boardlife.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// [검색어, 표시명(없으면 검색 결과 이름 사용)]
const GAMES = [
  // 1차 실패 - 다른 검색어로 재시도
  ['졸킨', '졸킨: 마야의 달력'],
  ['Planet Unknown', '행성을 찾아서'],
  ['오리진스 건축가', '오리진스: 인류 최초의 건축가들'],
  ['임페리얼 어썰트', '스타워즈: 임페리얼 어썰트'],
  ['연금술사', '연금술사들'],
  ['Detective Season', '디텍티브: 시즌 1'],
  ['화이트홀', '화이트홀 미스터리'],
  ['엑시트', '엑시트: 신비로운 박물관'],
  ['Fugitive', '퓨지티브'],
  ['Bottom of the 9th', '바텀 오브 더 나인스'],
  ['셰리프 노팅엄', '셰리프 오브 노팅엄'],
  ['더 크루', '스페이스 크루: 심해의 임무'],
  ['6 Nimmt', '6님트!'],
  ['달무티', '더 그레이트 달무티'],
  ['라스트 레거시', '라스트 레거시'],
  ['In a Grove', '인 어 그로브'],
  ['Last Will', '라스트 윌'],
  ['Once Upon a Time', '원스 어폰 어 타임'],

  // 누락된 게임들
  ['카탄 5-6인', '카탄 5-6인 확장'],
  ['원 나잇 데이브레이크', '원 나잇 얼티밋 웨어울프: 데이브레이크'],
  ['갱스터스 딜레마', null],
  ['동물장기', '동물 장기'],
  ['이웃집 몬스터', null],
  ['스트림스', null],
  ['온다', null],
  ['응급상황', null],
  ['레벨 8', null],
  ['술술카드', null],
  ['트릭스 앤 팬텀', null],
  ['솔로몬의 강', null],
  ['서바이벌 캄프', null],
  ['스타트업', null],
  ['파프니르', null],
  ['고래타점', null],
  ['도코종', null],
  ['콰트로', null],
  ['아발론 Abalone', '아발론 (Abalone)'],
  ['다크 호스', null],
  ['젠가', null],
  ['트위스터', null],
  ['마이크로 로봇', null],
  ['마스터마인드', null],
  ['픽 피크닉', null],
  ['번 레이트', null],
  ['일리야드', null],
  ['모노폴리 겨울왕국', '모노폴리: 디즈니 겨울왕국 2 에디션'],
  ['시체와 온천', '시체와 온천 (머더 미스테리)'],
  ['웬디 어른이 되렴', '웬디 어른이 되렴 (머더 미스테리)'],
  ['구두룡 저택', '구두룡 저택의 살인 (언박싱)'],
  ['늑대인간 마을의 축제', '늑대인간 마을의 축제 (언박싱)'],
  ['죄와 벌의 도서관', '죄와 벌의 도서관 (언박싱)'],
  ['개봉두수잭', null],
  ['퓨지티브 게임', '퓨지티브'],
];

async function searchBoardlife(keyword) {
  try {
    const body = new URLSearchParams({ action: 'searchGame', keyword }).toString();
    const res = await fetch(`${BASE}/game_ajax.php`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Origin': BASE,
        'Referer': `${BASE}/boardgame`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.games?.length) return null;
    const g = json.games[0];
    return {
      boardlife_id: String(g.number),
      boardlife_url: `${BASE}/game/${g.number}`,
      name: g.title,
      thumbnail_url: g.thumb || null,
    };
  } catch {
    return null;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY 필요');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: existing } = await supabase
    .from('player_games').select('boardlife_id').eq('player_id', PLAYER_ID).not('boardlife_id', 'is', null);
  const existingIds = new Set((existing ?? []).map(g => g.boardlife_id));

  console.log(`\n${GAMES.length}개 검색 시작...\n`);
  let success = 0, skip = 0, fail = 0;

  for (let i = 0; i < GAMES.length; i++) {
    const [query, displayName] = GAMES[i];
    process.stdout.write(`[${i + 1}/${GAMES.length}] ${displayName ?? query} ... `);

    const result = await searchBoardlife(query);
    if (!result) {
      console.log('❌ 검색 실패');
      fail++;
      await sleep(300);
      continue;
    }

    if (existingIds.has(result.boardlife_id)) {
      console.log(`⏭ 중복 (${result.name})`);
      skip++;
      await sleep(200);
      continue;
    }

    const { error } = await supabase.from('player_games').insert({
      player_id: PLAYER_ID,
      boardlife_id: result.boardlife_id,
      boardlife_url: result.boardlife_url,
      name: displayName ?? result.name,
      thumbnail_url: result.thumbnail_url,
      is_available: true,
    });

    if (error) {
      console.log(`⚠ DB 오류: ${error.message}`);
      fail++;
    } else {
      console.log(`✓ ${result.name}`);
      success++;
      existingIds.add(result.boardlife_id);
    }
    await sleep(400);
  }

  console.log(`\n완료: 성공 ${success} / 중복 skip ${skip} / 실패 ${fail}`);
}

main();
