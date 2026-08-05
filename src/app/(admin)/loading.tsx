export default function AdminLoading() {
  return (
    <div className="px-8 py-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="rounded" style={{ height: 20, width: 160, background: 'var(--surface-alt)' }} />
          <div className="rounded" style={{ height: 12, width: 100, background: 'var(--surface-alt)' }} />
        </div>
        <div className="rounded-lg" style={{ height: 36, width: 140, background: 'var(--surface-alt)' }} />
      </div>

      <div
        className="rounded-xl overflow-hidden border"
        style={{ borderColor: 'var(--border)' }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="px-4 py-4"
            style={{
              background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="rounded" style={{ height: 12, width: `${70 - i * 8}%`, background: 'var(--surface-alt)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
