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
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
            {['#', 'Cliente', 'Visitas', 'Total gastado', 'Puntos'].map((h) => (
              <th
                key={h}
                className={`px-3 py-2.5 text-xs font-medium ${h === '#' || h === 'Cliente' ? 'text-left' : 'text-right'}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((c, i) => (
            <tr
              key={c.client_id}
              style={{
                background: i % 2 === 0 ? 'transparent' : 'var(--surface-alt)',
                borderBottom: i === clients.length - 1 ? 'none' : '1px solid var(--border)',
              }}
            >
              <td className="px-3 py-2.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {i + 1}
              </td>
              <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--foreground)' }}>
                {c.full_name}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                {c.visit_count}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--brand)' }}>
                {fmtARS(c.total_spent)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                {c.total_points_earned.toLocaleString('es-AR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
