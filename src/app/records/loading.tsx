export default function Loading() {
  return (
    <div className="skeleton-page">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="skeleton-block" style={{ height: 12, width: 80, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 40, width: 160, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 1, width: 120, margin: '0 auto' }} />
      </div>
      {/* 필터 바 */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ height: 38, width: 140 }} />
        ))}
      </div>
      {/* 경기 카드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid rgba(201,168,76,0.1)' }}>
            <div style={{ padding: '1rem 1.4rem', borderBottom: '1px solid rgba(201,168,76,0.06)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <div className="skeleton-block" style={{ height: 22, width: 180 }} />
              <div className="skeleton-block" style={{ height: 18, width: 60 }} />
              <div className="skeleton-block" style={{ height: 18, width: 100 }} />
            </div>
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', borderBottom: j < 3 ? '1px solid rgba(201,168,76,0.05)' : 'none' }}>
                <div className="skeleton-block" style={{ height: 18, flex: 1 }} />
                <div className="skeleton-block" style={{ height: 14, width: 40 }} />
                <div className="skeleton-block" style={{ height: 14, width: 40 }} />
                <div className="skeleton-block" style={{ height: 14, width: 50 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
