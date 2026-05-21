export default function Loading() {
  return (
    <div className="skeleton-page">
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div className="skeleton-block" style={{ height: 12, width: 120, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 40, width: 220, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 1, width: 120, margin: '0 auto' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: 900, margin: '0 auto' }}>
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col}>
            <div className="skeleton-block" style={{ height: 10, width: 120, marginBottom: '1.2rem' }} />
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 0', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                <div className="skeleton-block" style={{ width: 20, height: 14 }} />
                <div className="skeleton-block" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <div className="skeleton-block" style={{ height: 16, flex: 1 }} />
                <div className="skeleton-block" style={{ width: 60, height: 22 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
