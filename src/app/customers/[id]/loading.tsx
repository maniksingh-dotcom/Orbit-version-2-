export default function CustomerDetailLoading() {
  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
      <div
        className="glass-card"
        style={{ height: 180, opacity: 0.5, animation: 'pulse-glow 2s infinite', marginBottom: 'var(--space-lg)' }}
      />
      <div
        className="glass-card"
        style={{ height: 120, opacity: 0.4, animation: 'pulse-glow 2s infinite', marginBottom: 'var(--space-lg)' }}
      />
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ width: 100, height: 40, background: 'var(--bg-surface)', borderRadius: '0.5rem', opacity: 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}
