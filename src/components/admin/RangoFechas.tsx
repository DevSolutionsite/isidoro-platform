'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const PRESETS = [
  { label: '7 días',  days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

interface Props {
  from: string
  to: string
}

export function RangoFechas({ from, to }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function pushRange(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', newFrom)
    params.set('to', newTo)
    router.push(`${pathname}?${params.toString()}`)
  }

  function applyPreset(days: number) {
    const toDate = new Date()
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000)
    pushRange(isoDate(fromDate), isoDate(toDate))
  }

  // Un preset está activo si el rango actual coincide con esos N días
  // terminando hoy (con 1 día de tolerancia por husos horarios/redondeo).
  const daysInRange = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000))
  const endsToday = isoDate(new Date()) === to
  const activePreset = endsToday ? PRESETS.find((p) => Math.abs(p.days - daysInRange) <= 1)?.days : undefined

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: activePreset === p.days ? 'var(--brand)' : 'var(--surface-alt)',
              color:      activePreset === p.days ? 'var(--background)' : 'var(--text-muted)',
              border:     `1px solid ${activePreset === p.days ? 'var(--brand)' : 'var(--border)'}`,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Desde
          </label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => pushRange(e.target.value, to)}
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
            value={to}
            min={from}
            max={isoDate(new Date())}
            onChange={(e) => pushRange(from, e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>
      </div>
    </div>
  )
}
