export default function CustomersLoading() {
  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
      <div className="page-header">
        <div style={{ width: 180, height: 36, background: 'var(--bg-surface)', borderRadius: '0.5rem' }} />
        <div style={{ width: 160, height: 40, background: 'var(--bg-surface)', borderRadius: '9999px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-lg)' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card"
            style={{ height: 180, opacity: 0.5, animation: 'pulse-glow 2s infinite' }}
          />
        ))}
      </div>
    </div>
  );
}
