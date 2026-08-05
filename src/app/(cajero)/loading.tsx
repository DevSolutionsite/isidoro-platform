export default function CajeroLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div
        className="flex rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 py-2.5"
            style={{ background: 'var(--surface)' }}
          >
            <div
              className="mx-auto rounded"
              style={{ height: 14, width: '60%', background: 'var(--surface-alt)' }}
            />
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl px-5 py-10"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="mx-auto rounded"
          style={{ height: 12, width: '70%', background: 'var(--surface-alt)' }}
        />
      </div>
    </div>
  )
}
