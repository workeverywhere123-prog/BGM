'use client';

import { useState, useTransition } from 'react';
import LapisIcon from '@/components/LapisIcon';
import { claimRulesLapisAction } from './actions';

interface Props {
  isLoggedIn: boolean;
  alreadyClaimed: boolean;
}

export default function RulesClaimButton({ isLoggedIn, alreadyClaimed: initialClaimed }: Props) {
  const [claimed, setClaimed] = useState(initialClaimed);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');

  const handleClaim = () => {
    startTransition(async () => {
      const res = await claimRulesLapisAction();
      if (res.ok) {
        setClaimed(true);
        setMsg('');
      } else {
        setMsg(res.error.message);
      }
    });
  };

  if (!isLoggedIn) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', border: '1px dashed rgba(201,168,76,0.2)' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--white-dim)', opacity: 0.5 }}>
          로그인 후 규칙 정독 보너스를 받을 수 있습니다
        </p>
      </div>
    );
  }

  if (claimed) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', border: '1px solid rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.05)' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.18em', color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          ✓ 규칙 정독 완료 —{' '}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <LapisIcon size={13} /> +1 LAPIS 지급됨
          </span>
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2.5rem', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(30,74,52,0.12)' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '0.6rem' }}>
        규칙을 모두 읽으셨나요?
      </p>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
        규칙 정독 인증 시{' '}
        <span style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
          <LapisIcon size={14} /> +1 LAPIS
        </span>{' '}
        를 드립니다 — 최초 1회
      </p>
      <button
        onClick={handleClaim}
        disabled={isPending}
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          padding: '0.8rem 2.5rem',
          background: isPending ? 'rgba(201,168,76,0.3)' : 'var(--gold)',
          color: '#0b2218',
          border: 'none',
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s',
        }}
      >
        <LapisIcon size={14} />
        {isPending ? '처리 중...' : '규칙 정독 완료 — 보너스 받기'}
      </button>
      {msg && (
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#f87171', marginTop: '0.75rem' }}>
          {msg}
        </p>
      )}
    </div>
  );
}
