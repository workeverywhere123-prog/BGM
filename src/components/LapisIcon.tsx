interface LapisIconProps {
  size?: number;
  style?: React.CSSProperties;
}

export default function LapisIcon({ size = 16, style }: LapisIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="lapisGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a8d8f0" />
          <stop offset="30%" stopColor="#4a9fd4" />
          <stop offset="65%" stopColor="#1a5fa8" />
          <stop offset="100%" stopColor="#0d3a6b" />
        </linearGradient>
        <linearGradient id="lapisFacet" x1="12" y1="2" x2="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d0eeff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#4a9fd4" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="lapisShine" x1="4" y1="8" x2="12" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 보석 메인 바디 - 다이아몬드 컷 */}
      <polygon points="12,2 20,8 20,16 12,22 4,16 4,8" fill="url(#lapisGrad)" />

      {/* 상단 파셋 (밝은 면) */}
      <polygon points="12,2 20,8 12,10 4,8" fill="url(#lapisFacet)" />

      {/* 중간 파셋 라인 */}
      <polygon points="4,8 12,10 12,22 4,16" fill="#1a5fa8" opacity="0.6" />
      <polygon points="20,8 12,10 12,22 20,16" fill="#0d3a6b" opacity="0.7" />

      {/* 하이라이트 (광택) */}
      <polygon points="12,2 16,6 12,7 8,6" fill="url(#lapisShine)" />

      {/* 테두리 - 금색 */}
      <polygon points="12,2 20,8 20,16 12,22 4,16 4,8" fill="none" stroke="#c9a84c" strokeWidth="0.8" opacity="0.9" />

      {/* 내부 선 - 파셋 강조 */}
      <line x1="12" y1="2" x2="12" y2="10" stroke="#c9a84c" strokeWidth="0.4" opacity="0.5" />
      <line x1="4" y1="8" x2="12" y2="10" stroke="#c9a84c" strokeWidth="0.4" opacity="0.5" />
      <line x1="20" y1="8" x2="12" y2="10" stroke="#c9a84c" strokeWidth="0.4" opacity="0.5" />

      {/* 작은 별빛 반짝임 */}
      <circle cx="9" cy="6" r="0.7" fill="white" opacity="0.8" />
      <circle cx="15" cy="5" r="0.4" fill="white" opacity="0.5" />
    </svg>
  );
}

/* 금액 표시용 - 숫자 + 아이콘 + LAPIS 텍스트 */
interface LapisAmountProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showSign?: boolean;
  style?: React.CSSProperties;
}

export function LapisAmount({ amount, size = 'md', showSign = false, style }: LapisAmountProps) {
  const sizes = {
    sm: { icon: 12, font: '0.7rem', gap: '0.2rem' },
    md: { icon: 16, font: '1rem', gap: '0.3rem' },
    lg: { icon: 20, font: '1.3rem', gap: '0.35rem' },
  };
  const s = sizes[size];
  const isPositive = amount > 0;
  const color = showSign
    ? (isPositive ? 'var(--gold)' : '#f87171')
    : 'var(--gold)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: s.gap, fontFamily: "'Cinzel', serif", fontSize: s.font, color, ...style }}>
      <LapisIcon size={s.icon} />
      {showSign && isPositive ? '+' : ''}{amount}
      <span style={{ fontSize: `calc(${s.font} * 0.7)`, opacity: 0.7 }}>LAPIS</span>
    </span>
  );
}

/* 인라인 LAPIS 라벨 (텍스트 중간에 삽입) */
export function LapisLabel({ style }: { style?: React.CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', ...style }}>
      <LapisIcon size={14} />
      <span>LAPIS</span>
    </span>
  );
}
