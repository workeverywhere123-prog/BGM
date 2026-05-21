// 보드라이프에서 게임 검색 후 player_games에 일괄 삽입
// 실행: node scripts/import-boardlife-games.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://khvkuowhnavsaorgjpyo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLAYER_ID = '7fff8515-8484-435a-bc8a-af1b02fc43e1';
const BASE = 'https://boardlife.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const GAMES = [
  '7 원더스 대결',
  '7 원더스 대결 판테온',
  '7 원더스 대결 아고라',
  '헤게모니',
  '졸킨 마야의 달력',
  '푸에르토 리코',
  '아그리콜라',
  '카탄',
  '행성을 찾아서',
  '휘슬 마운틴',
  '오리진스 인류 최초의 건축가들',
  '스타워즈 임페리얼 어썰트',
  '빌리지',
  '연금술사들',
  '라 파밀리아',
  '데이브레이크',
  '안도르의 전설',
  '팬데믹',
  '어콰이어',
  '포실리스',
  '디텍티브 모던 크라임',
  '디텍티브 시즌 1',
  '서스펙트',
  '세일럼 1692',
  '화이트채플에서 온 편지',
  '화이트홀 미스터리',
  '튜링 머신',
  '클루',
  '엑시트 신비로운 박물관',
  '스카이 팀',
  '로스트 시티',
  '하나미코지',
  '반지의 제왕 대결',
  '퓨지티브',
  '바텀 오브 더 나인스',
  '코드네임',
  '스컬킹',
  '사보타지',
  '딕싯',
  '레지스탕스 아발론',
  '셰리프 오브 노팅엄',
  '레디 셋 벳',
  '원 나잇 얼티밋 웨어울프',
  '스페이스 크루 심해의 임무',
  '스파이폴',
  '하나비',
  '티츄',
  '6님트',
  '러브 레터',
  '더 마인드',
  '더 그레이트 달무티',
  '스시 고',
  '포켓 매드니스',
  '락 페이퍼 위저드',
  '타임라인',
  '왓 두 유 밈',
  '노 땡스',
  '마피아',
  '보틀 임프',
  '라스트 레거시',
  '스카우트',
  '인 어 그로브',
  '무빙 와일드',
  '나인 타일 패닉',
  '마스크맨',
  '해저탐험',
  '두리안',
  '아줄',
  '타케노코',
  '서바이브 아틀란티스',
  '라스트 윌',
  '리코셰 로봇',
  '쿼리도',
  '시타델',
  '루미큐브',
  '할리갈리',
  '우노',
  '텔레스트레이션',
  '디크립토',
  '도쿄 하이웨이',
  '다빈치 코드',
  '원스 어폰 어 타임',
  '아발론',
  '코드네임 듀엣',
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다');
    console.error('실행: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-boardlife-games.mjs');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 이미 있는 항목 확인
  const { data: existing } = await supabase
    .from('player_games')
    .select('boardlife_id')
    .eq('player_id', PLAYER_ID)
    .not('boardlife_id', 'is', null);
  const existingIds = new Set((existing ?? []).map(g => g.boardlife_id));

  console.log(`\n총 ${GAMES.length}개 게임 검색 시작...\n`);

  let success = 0, skip = 0, fail = 0;

  for (let i = 0; i < GAMES.length; i++) {
    const query = GAMES[i];
    process.stdout.write(`[${i + 1}/${GAMES.length}] ${query} ... `);

    const result = await searchBoardlife(query);
    if (!result) {
      console.log('❌ 검색 실패');
      fail++;
      await sleep(300);
      continue;
    }

    if (existingIds.has(result.boardlife_id)) {
      console.log(`⏭ 이미 있음 (${result.name})`);
      skip++;
      await sleep(200);
      continue;
    }

    const { error } = await supabase.from('player_games').insert({
      player_id: PLAYER_ID,
      boardlife_id: result.boardlife_id,
      boardlife_url: result.boardlife_url,
      name: result.name,
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

    await sleep(400); // 보드라이프 rate limit 방지
  }

  console.log(`\n완료: 성공 ${success} / 중복 skip ${skip} / 실패 ${fail}`);
}

main();
