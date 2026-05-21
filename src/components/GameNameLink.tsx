'use client';

import { useState } from 'react';
import GamePopup, { type GameInfo } from './GamePopup';

// 세션 내 캐시 — 같은 이름은 한 번만 검색
const cache = new Map<string, GameInfo | null>();

interface Props {
  name: string;
  // 이미 boardlife 정보가 있으면 직접 팝업 (검색 생략)
  gameInfo?: {
    boardlife_id: string;
    boardlife_url?: string;
    thumbnail_url?: string | null;
  };
  style?: React.CSSProperties;
  className?: string;
}

export default function GameNameLink({ name, gameInfo, style, className }: Props) {
  const [popup, setPopup] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;

    // boardlife_id가 이미 있으면 바로 팝업
    if (gameInfo?.boardlife_id) {
      setPopup({
        boardlife_id: gameInfo.boardlife_id,
        boardlife_url: gameInfo.boardlife_url ?? `https://boardlife.co.kr/game/${gameInfo.boardlife_id}`,
        name,
        thumbnail_url: gameInfo.thumbnail_url ?? null,
      });
      return;
    }

    // 캐시 확인
    if (cache.has(name)) {
      const cached = cache.get(name)!;
      if (cached) setPopup(cached);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/boardlife/search?q=${encodeURIComponent(name)}`);
      const data: { boardlife_id: string; boardlife_url: string; name: string; thumbnail_url: string | null }[] = await res.json();

      const match =
        data.find(g => g.name.trim() === name.trim()) ??
        data.find(g => g.name.toLowerCase().includes(name.toLowerCase())) ??
        data[0] ??
        null;

      const info: GameInfo | null = match
        ? { boardlife_id: match.boardlife_id, boardlife_url: match.boardlife_url, name: match.name, thumbnail_url: match.thumbnail_url }
        : null;

      cache.set(name, info);
      if (info) setPopup(info);
    } catch {
      cache.set(name, null);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        title={`${name} 정보 보기`}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(201,168,76,0.35)',
          textUnderlineOffset: '3px',
          ...style,
        }}
        className={className}
      >
        {name}
        {loading && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45em', marginLeft: '0.4em', opacity: 0.5 }}>...</span>}
      </button>

      {popup && <GamePopup game={popup} onClose={() => setPopup(null)} />}
    </>
  );
}
