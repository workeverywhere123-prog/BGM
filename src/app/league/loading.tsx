export default function Loading() {
  return (
    <div className="skeleton-page">
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div className="skeleton-block" style={{ height: 12, width: 100, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 40, width: 180, margin: '0 auto 1rem' }} />
        <div className="skeleton-block" style={{ height: 1, width: 120, margin: '0 auto' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid rgba(201,168,76,0.1)', padding: '1.5rem' }}>
            <div className="skeleton-block" style={{ height: 22, width: '50%', marginBottom: '0.6rem' }} />
            <div className="skeleton-block" style={{ height: 14, width: '80%', marginBottom: '1.2rem' }} />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid rgba(201,168,76,0.06)' }}>
                <div className="skeleton-block" style={{ width: 20, height: 14 }} />
                <div className="skeleton-block" style={{ height: 16, flex: 1 }} />
                <div className="skeleton-block" style={{ width: 50, height: 18 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
