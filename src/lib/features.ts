export interface Feature {
  href: string;
  icon: string;
  title: string;
  desc: string;
}

export const FEATURES: Feature[] = [
  {
    href: '/league',
    icon: '🏆',
    title: '리그 경기',
    desc: '함께 즐기는 시즌제 보드게임 리그입니다. 매 경기 포인트를 쌓아 시즌 순위를 확인해보세요.',
  },
  {
    href: '/notice',
    icon: '📢',
    title: '공지사항',
    desc: 'BGM 모임 일정 변경, 이벤트 안내 등 중요한 소식을 확인하세요.',
  },
  {
    href: '/rooms',
    icon: '🚪',
    title: '모임일정',
    desc: '방을 열어 동료를 모으세요. 당신이 판을 짜는 순간, 게임은 이미 시작된 것입니다.',
  },
  {
    href: '/games',
    icon: '🎲',
    title: '보드게임책장',
    desc: '어떤 게임을 알고 있느냐가 전략의 깊이를 결정합니다. 무기를 먼저 파악한 자가 유리합니다.',
  },
  {
    href: '/records',
    icon: '📋',
    title: '기록실',
    desc: '함께한 모든 게임의 기록이 이곳에 남습니다. 지난 모임을 돌아보고 추억을 공유하세요.',
  },
  {
    href: '/stats',
    icon: '📊',
    title: '분석실',
    desc: '감이 아니라 숫자로 증명하세요. 데이터는 당신이 숨기고 싶은 진실까지 보여줍니다.',
  },
  {
    href: '/leaderboard',
    icon: '🥇',
    title: '명예의전당',
    desc: '지금 이 순간에도 순위는 바뀌고 있습니다. 당신은 몇 위입니까?',
  },
  {
    href: '/rules',
    icon: '⚖️',
    title: '규칙',
    desc: '룰을 모르는 자는 반드시 당합니다. 변칙과 예외까지 꿰뚫어야 살아남습니다.',
  },
  {
    href: '/raffle',
    icon: '🎰',
    title: '행운판',
    desc: '실력만으로 부족할 때, 운이 판을 뒤집습니다. 단 한 번의 선택이 모든 것을 바꿉니다.',
  },
];
