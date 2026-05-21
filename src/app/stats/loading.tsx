export default function Loading() {
  return (
    <div className="skeleton-page">
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div className="skeleton-block" style={{ height: 12, width: 180, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 40, width: 160, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 1, width: 120, margin: '0 auto' }} />
      </div>
      {/* 요약 카드 3개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3.5rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid rgba(201,168,76,0.1)', padding: '1.8rem', textAlign: 'center' }}>
            <div className="skeleton-block" style={{ height: 10, width: 80, margin: '0 auto 1rem' }} />
            <div className="skeleton-block" style={{ height: 48, width: 100, margin: '0 auto' }} />
          </div>
        ))}
      </div>
      {/* 2단 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className="skeleton-block" style={{ height: 10, width: 140, marginBottom: '0.8rem' }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-block" style={{ height: 56 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
