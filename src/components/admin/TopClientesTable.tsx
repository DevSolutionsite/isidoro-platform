import type { ReportTopClient } from '@/lib/types'

const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    maximumFractionDigits: 0,
  }).format(n)

interface Props {
  clients: ReportTopClient[]
}

export function TopClientesTable({ clients }: Props) {
  if (clients.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>
        Sin datos para el período
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['#', 'Cliente', 'Visitas', 'Total gastado', 'Puntos'].map((h) => (
              <th
                key={h}
                className={`py-2 text-xs font-medium ${h === '#' || h === 'Cliente' ? 'text-left pr-4' : 'text-right pr-4 last:pr-0'}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((c, i) => (
            <tr key={c.client_id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="py-2.5 pr-4 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {i + 1}
              </td>
              <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--foreground)' }}>
                {c.full_name}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                {c.visit_count}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums" style={{ color: 'var(--brand)' }}>
                {fmtARS(c.total_spent)}
              </td>
              <td className="py-2.5 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                {c.total_points_earned.toLocaleString('es-AR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
