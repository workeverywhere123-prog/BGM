'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

const SECTIONS = [
  {
    icon: '♟️',
    title: '보드게임 초보자도 환영!',
    body: '룰을 잘 몰라도 괜찮습니다. 처음 오신 분들도 자연스럽게 어울릴 수 있도록 설명과 진행을 도와드립니다. 부담 없이 참여해주세요.',
  },
  {
    icon: '🧠',
    title: '헤비 보드게임도 환영!',
    body: '전략 깊은 헤비 게임도 충분히 즐기실 수 있어요. 장시간·복잡한 게임도 테이블을 따로 구성해 집중해서 플레이합니다.',
  },
  {
    icon: '🎉',
    title: '즐겁고 편안한 모임!',
    body: '승패보다 함께 즐기는 시간을 더 중요하게 생각합니다. 서로 배려하며 웃고 즐길 수 있는 분위기를 함께 만들어가요!',
  },
];

const RULES = [
  { label: '🚩 모임 참여 규칙', items: [
    '모임 공지 투표에 반드시 참여하세요. 미참여 시 사전 고지 없이 강퇴될 수 있습니다.',
    '확정 후 사전 연락 없는 불참(노쇼)·당일 취소는 경고·강퇴 사유입니다.',
    '반복적인 지각은 경고·강퇴 사유입니다.',
    '모임 장소마다 규칙이 다르므로, 장소 제공자에게 사전에 꼭 문의하세요.',
  ]},
  { label: '🌟 예의 및 매너', items: [
    '나이와 상관없이 서로 존중하는 태도를 지켜주세요.',
    '욕설·비하 발언·불쾌한 언행은 금지입니다. 반복 시 즉시 강퇴될 수 있습니다.',
    '게임 중 과도한 승부욕·훈수·분위기를 해치는 언행은 삼가주세요.',
    '보드게임 구성물은 소중한 자산입니다. 아끼고 소중히 다뤄주세요.',
    '타인의 연락처·사진 등 개인정보 무단 공유는 금지입니다.',
  ]},
  { label: '🚫 금지 사항', items: [
    '개인 사업·SNS·오픈채팅·다른 모임 홍보 등 개인 홍보 일절 금지',
    '종교·정치·다단계·투자 권유 관련 발언 금지',
    '모임 분위기를 해치는 과도한 논쟁·분쟁 유도 행위 금지',
  ]},
  { label: '🔒 추가 사항', items: [
    '모임 장소의 이용 수칙 및 기본 에티켓을 사전에 숙지해주세요.',
    '모임 중 긴급 상황 발생 시 즉시 운영진에게 알려주세요.',
    '음식 알레르기 등 개인 주의 사항이 있으면 사전에 공유해주세요.',
    '본 모임은 한인 중심 모임으로 기본적으로 한국어 소통을 원칙으로 합니다.',
  ]},
];

export default function WelcomeNoticeModal({ noticeId }: { noticeId: string }) {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [agreeing, setAgreeing] = useState(false);

  if (!visible) return null;

  async function handleAgree() {
    setAgreeing(true);
    await fetch('/api/notice/ack', { method: 'POST' });
    setVisible(false);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolled(true);
  }

  const modal = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#0a1a0f',
        border: '1px solid rgba(201,168,76,0.35)',
        maxWidth: 620, width: '100%',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.25s ease',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 상단 골드 바 */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', flexShrink: 0 }} />

        {/* 헤더 */}
        <div style={{ padding: '1.8rem 2rem 1.2rem', borderBottom: '1px solid rgba(201,168,76,0.12)', flexShrink: 0 }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>
            BOARDGAME IN MELBOURNE — 필독 공지
          </p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.2, marginBottom: '0.5rem' }}>
            BGM 모임 참여 규칙
          </h2>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'rgba(244,239,230,0.5)', fontStyle: 'italic' }}>
            아래 내용을 끝까지 읽고 숙지 완료 버튼을 눌러주세요
          </p>
        </div>

        {/* 스크롤 본문 */}
        <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

          {/* 환영 메시지 */}
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'rgba(244,239,230,0.8)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            안녕하세요! 🎲 보드게임을 즐기고 싶은 누구나 편하게 참여할 수 있는 모임입니다.
            처음이신 분부터 베테랑까지 모두 환영합니다. 😊
          </p>

          {/* 환영 카드 3개 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '2rem' }}>
            {SECTIONS.map(s => (
              <div key={s.title} style={{ padding: '1rem', background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.1)' }}>
                <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.4rem' }}>{s.icon}</span>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>{s.title}</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'rgba(244,239,230,0.6)', lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>

          {/* 규칙 섹션들 */}
          {RULES.map((section, si) => (
            <div key={si} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>{section.label}</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.15)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {section.items.map((item, ii) => (
                  <div key={ii} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold)', flexShrink: 0, marginTop: '0.2rem' }}>{ii + 1}.</span>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.98rem', color: 'rgba(244,239,230,0.8)', lineHeight: 1.7 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 마무리 문구 */}
          <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(30,74,52,0.1)', marginTop: '1rem' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'rgba(244,239,230,0.7)', lineHeight: 1.9, fontStyle: 'italic' }}>
              모두가 즐겁게 보드게임을 즐길 수 있도록<br />
              기본적인 매너와 규칙을 꼭 지켜주세요! 🎲✨<br />
              함께 웃고 즐길 수 있는 좋은 모임 만들어가요 😊
            </p>
            <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: '1.8rem', color: 'var(--gold)', marginTop: '0.8rem', opacity: 0.6 }}>BGM</p>
          </div>

          <div style={{ height: '0.5rem' }} />
        </div>

        {/* 하단 버튼 */}
        <div style={{ padding: '1.2rem 2rem', borderTop: '1px solid rgba(201,168,76,0.12)', flexShrink: 0, background: '#0a1a0f' }}>
          {!scrolled && (
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'rgba(244,239,230,0.3)', textAlign: 'center', marginBottom: '0.8rem', letterSpacing: '0.1em' }}>
              ↓ 아래까지 스크롤하면 숙지 완료 버튼이 활성화됩니다
            </p>
          )}
          <button
            onClick={handleAgree}
            disabled={!scrolled || agreeing}
            style={{
              width: '100%', padding: '0.9rem',
              background: scrolled ? 'var(--gold)' : 'rgba(201,168,76,0.15)',
              border: scrolled ? 'none' : '1px solid rgba(201,168,76,0.2)',
              color: scrolled ? '#0b2218' : 'rgba(244,239,230,0.3)',
              fontFamily: "'Cinzel', serif", fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.2em', cursor: scrolled ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
            }}
          >
            {agreeing ? '처리 중...' : scrolled ? '✓ 숙지 완료 — 모임 참여하기' : '내용을 모두 읽어주세요'}
          </button>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', color: 'rgba(244,239,230,0.2)', textAlign: 'center', marginTop: '0.6rem' }}>
            공지 전문은 공지사항 페이지에서 언제든지 다시 확인할 수 있습니다
          </p>
        </div>

        <style>{`
          @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
