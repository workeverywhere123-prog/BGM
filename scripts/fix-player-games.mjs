// 3차 - 잘못된 항목 수정 + 사진 확인 게임 추가
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://khvkuowhnavsaorgjpyo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLAYER_ID = '7fff8515-8484-435a-bc8a-af1b02fc43e1';
const BASE = 'https://boardlife.co.kr';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// ── 삭제할 잘못된 항목 (boardlife_id 기준) ──────────────────────────────────
// 이 boardlife_id들은 잘못 매칭된 항목
const DELETE_BY_BOARDLIFE_ID = [
  '2633',  // 배틀스타 갤럭티카: 데이브레이크 확장 (사용자가 가진건 데이브레이크 standalone)
  '5572',  // 팬데믹 레거시: 시즌 1 (사용자가 가진건 팬데믹 기본판)
  '5601',  // 그들은 눈에 띄지 않게 온다 (사용자가 원한건 온다 - 다른 게임)
];

// boardlife_id null인 잘못된 항목 (name 기준으로 삭제)
const DELETE_BY_NAME = [
  '고래타점', // 사진에 없음 - 잘못 추가됨
];

// ── 기존 항목 이름/boardlife 수정 ──────────────────────────────────────────
// [boardlife_id, 새이름, 새boardlife_id, 새url] - 검색으로 찾을 수 없는 경우 직접 지정
const MANUAL_FIXES = [
  // 마스터마인드 → 빅토리안 마스터마인드가 아닌 원본 마스터마인드
  // 던전 트위스터 → 트위스터 (물리게임) - 이건 다른 게임이니 트위스터 삭제 필요한지 확인
];

// ── 새로 추가할 게임 (사진에서 확인) ────────────────────────────────────────
// [검색어, 표시명(null이면 검색 결과 이름)]
const NEW_GAMES = [
  // 사진에서 확인된 보드라이프 검색 가능 게임들
  ['굿크리터스', '굿크리터스'],
  ['Secret Hitler', '시크릿 히틀러'],
  ['Werewords', '웨어워즈'],
  ['One Night Revolution', '원 나잇 레볼루션'],
  ['Las Vegas Royale', '라스베가스 로얄'],
  ['Condottiere', '콘도티에레'],
  ['Cheaty Mages', '치티 메이지스'],
  ['Muffin Time', '머핀 타임'],
  ['바퀴벌레 포커', '바퀴벌레 포커'],
  ['Silver Amulet', '실버: 아뮬렛'],
  ['Truck Off', '트럭 오프'],
  ['QUIXO', '퀵소'],
  ['Camel Up Cards', '카멜 업 카드게임'],
  ['Slide Quest', '슬라이드 퀘스트'],
  ['Modern Art', '모던 아트'],
  ['Risk Game of Thrones', '리스크: 왕좌의 게임'],
  ['Detective Club', '디텍티브 클럽'],
  ['Gold Rush Board Game', '골드 러시'],
  ['Formula D', '포뮬러 D'],
  ['Werewolves Pact', '밀러스 홀로: 더 팩트'],
  ['Sticheln', '스티헬른'],
  ['Railroad Ink Red', '레일로드 잉크: 블레이징 레드'],
  ['King Solomon', '솔로몬 왕의 광산'],
  ['마피아 데 쿠바', '마피아 데 쿠바'],
  ['Monopoly Deal', '모노폴리 딜'],
  ['팬데믹', '팬데믹'],
  ['데이브레이크 보드게임', '데이브레이크'],
  ['온다 보드게임', '온다'],
  // 한국 게임
  ['사랑하는 당신의', '사랑하는 당신의 로맨틱 규칙관'],
  ['역사 속 사기꾼', '역사 속 사기꾼들'],
  ['사자를 잡아라', '사자를 잡아라'],
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

  // ── 1. 잘못된 항목 삭제 ──────────────────────────────────────────────────
  console.log('\n=== 잘못된 항목 삭제 ===');

  for (const bid of DELETE_BY_BOARDLIFE_ID) {
    const { data, error } = await supabase
      .from('player_games')
      .delete()
      .eq('player_id', PLAYER_ID)
      .eq('boardlife_id', bid)
      .select('name');
    if (error) {
      console.log(`  ⚠ boardlife_id ${bid} 삭제 오류: ${error.message}`);
    } else if (data?.length) {
      console.log(`  🗑 삭제: ${data[0].name} (boardlife ${bid})`);
    }
    await sleep(200);
  }

  for (const name of DELETE_BY_NAME) {
    const { data, error } = await supabase
      .from('player_games')
      .delete()
      .eq('player_id', PLAYER_ID)
      .eq('name', name)
      .select('name');
    if (error) {
      console.log(`  ⚠ "${name}" 삭제 오류: ${error.message}`);
    } else if (data?.length) {
      console.log(`  🗑 삭제: ${data[0].name}`);
    }
    await sleep(200);
  }

  // 트위스터 - 던전 트위스터(1152)가 아닌 실제 트위스터
  // 마스터마인드 - 빅토리안 마스터마인드(10815)가 아닌 원래 마스터마인드
  // 이 둘은 이름이 다르게 들어가 있으므로 그냥 두고 아래서 올바른 것 추가

  // ── 2. 현재 boardlife_id 목록 로드 ────────────────────────────────────────
  const { data: existing } = await supabase
    .from('player_games').select('boardlife_id, name').eq('player_id', PLAYER_ID).not('boardlife_id', 'is', null);
  const existingIds = new Set((existing ?? []).map(g => g.boardlife_id));
  const existingNames = new Set((existing ?? []).map(g => g.name));

  // ── 3. 새 게임 추가 ──────────────────────────────────────────────────────
  console.log(`\n=== 새 게임 추가 (${NEW_GAMES.length}개) ===`);
  let success = 0, skip = 0, fail = 0;

  for (let i = 0; i < NEW_GAMES.length; i++) {
    const [query, displayName] = NEW_GAMES[i];
    process.stdout.write(`[${i + 1}/${NEW_GAMES.length}] ${displayName} ... `);

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
      console.log(`✓ ${result.name} (id: ${result.boardlife_id})`);
      success++;
      existingIds.add(result.boardlife_id);
    }
    await sleep(400);
  }

  // ── 4. 이름만 추가 (검색 안 되는 게임) ────────────────────────────────────
  const NAME_ONLY = [
    'CAUS',
    'Yahpo Lounge',
    'MENSA Universe',
    'Midnight Jungle',
    '벌칙카드 (Survival Trap)',
    'Blitz!',
  ];

  console.log(`\n=== 이름만 추가 (${NAME_ONLY.length}개) ===`);
  for (const name of NAME_ONLY) {
    if (existingNames.has(name)) {
      console.log(`  ⏭ 이미 있음: ${name}`);
      continue;
    }
    const { error } = await supabase.from('player_games').insert({
      player_id: PLAYER_ID,
      name,
      is_available: true,
    });
    if (error) {
      console.log(`  ⚠ "${name}" 오류: ${error.message}`);
    } else {
      console.log(`  ✓ ${name}`);
      success++;
    }
    await sleep(200);
  }

  console.log(`\n완료: 성공 ${success} / 중복 skip ${skip} / 실패 ${fail}`);
}

main();
