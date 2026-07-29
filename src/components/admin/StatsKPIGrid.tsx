import type { ReportSummary } from '@/lib/types'

const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    maximumFractionDigits: 0,
  }).format(n)

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-AR').format(n)

interface Props {
  summary: ReportSummary
}

export function StatsKPIGrid({ summary }: Props) {
  const kpis = [
    { label: 'Facturación',         value: fmtARS(summary.total_revenue) },
    { label: 'Consumos',            value: fmtNum(summary.total_consumptions) },
    { label: 'Clientes únicos',     value: fmtNum(summary.unique_clients) },
    { label: 'Puntos acreditados',  value: fmtNum(summary.total_points_credited) },
    { label: 'Puntos canjeados',    value: fmtNum(summary.total_points_redeemed) },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-2xl px-5 py-4 flex flex-col gap-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {kpi.label}
          </p>
          <p
            className="text-2xl font-bold tabular-nums font-display"
            style={{ color: 'var(--foreground)' }}
          >
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  )
}
