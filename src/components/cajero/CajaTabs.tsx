import Link from 'next/link'

export function CajaTabs({ active }: { active: 'consumo' | 'canje' | 'division' }) {
  return (
    <div
      className="flex rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <Link
        href="/caja"
        className="flex-1 py-2.5 text-sm font-semibold text-center transition-colors"
        style={{
          background: active === 'consumo' ? 'var(--brand)' : 'var(--surface)',
          color: active === 'consumo' ? 'var(--background)' : 'var(--text-muted)',
        }}
      >
        Consumo
      </Link>
      <Link
        href="/caja/canje"
        className="flex-1 py-2.5 text-sm font-semibold text-center transition-colors"
        style={{
          background: active === 'canje' ? 'var(--brand)' : 'var(--surface)',
          color: active === 'canje' ? 'var(--background)' : 'var(--text-muted)',
        }}
      >
        Canje
      </Link>
      <Link
        href="/caja/division"
        className="flex-1 py-2.5 text-sm font-semibold text-center transition-colors"
        style={{
          background: active === 'division' ? 'var(--brand)' : 'var(--surface)',
          color: active === 'division' ? 'var(--background)' : 'var(--text-muted)',
        }}
      >
        División
      </Link>
    </div>
  )
}
