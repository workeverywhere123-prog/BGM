export default function Loading() {
  return (
    <div className="skeleton-page">
      {/* 제목 */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="skeleton-block" style={{ height: 12, width: 100, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 36, width: 200, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 1, width: 120, margin: '0 auto' }} />
      </div>
      {/* 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid rgba(201,168,76,0.1)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div className="skeleton-block" style={{ height: 14, width: '60%' }} />
            <div className="skeleton-block" style={{ height: 11, width: '80%' }} />
            <div className="skeleton-block" style={{ height: 11, width: '45%' }} />
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="skeleton-block" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
