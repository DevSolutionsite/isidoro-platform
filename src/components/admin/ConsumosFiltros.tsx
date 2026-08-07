'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Cajero {
  id: string
  full_name: string
}

interface Props {
  cajeros: Cajero[]
  defaultCashier: string
  defaultFrom: string
  defaultTo: string
}

export function ConsumosFiltros({ cajeros, defaultCashier, defaultFrom, defaultTo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // cualquier cambio de filtro reinicia la paginación
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Cajero
        </label>
        <select
          defaultValue={defaultCashier}
          onChange={(e) => setParam('cashier', e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          <option value="">Todos</option>
          {cajeros.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Desde
        </label>
        <input
          type="date"
          defaultValue={defaultFrom}
          onChange={(e) => setParam('from', e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Hasta
        </label>
        <input
          type="date"
          defaultValue={defaultTo}
          onChange={(e) => setParam('to', e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        />
      </div>

      {(defaultCashier || defaultFrom || defaultTo) && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-xs font-medium px-3 py-2 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
