import type { ReportSummary } from '@/lib/types'

const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    maximumFractionDigits: 0,
  }).format(n)

const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-AR').format(n)

function IconRevenue() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.75" />
      <path strokeLinecap="round" d="M5.5 9v0M18.5 15v0" />
    </svg>
  )
}

function IconConsumos() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v16.5l-3-1.75-3 1.75-3-1.75-3 1.75V3z" />
      <path strokeLinecap="round" d="M9 8h6M9 11.5h6" />
    </svg>
  )
}

function IconClientes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 4.2a3 3 0 010 5.6M18 19c0-2.4-1.6-4.3-3.8-4.9" />
    </svg>
  )
}

function IconPuntosAcreditados() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L12 3.5z" />
    </svg>
  )
}

function IconPuntosCanjeados() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="8" width="18" height="12" rx="1.5" />
      <path strokeLinecap="round" d="M3 12h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8V20M12 8c-1.4 0-3-.9-3-2.5S10.1 3 11.5 3 12 5 12 8zM12 8c1.4 0 3-.9 3-2.5S13.9 3 12.5 3 12 5 12 8z" />
    </svg>
  )
}

interface Props {
  summary: ReportSummary
}

export function StatsKPIGrid({ summary }: Props) {
  const kpis = [
    { label: 'Facturación',        value: fmtARS(summary.total_revenue),         Icon: IconRevenue },
    { label: 'Consumos',           value: fmtNum(summary.total_consumptions),    Icon: IconConsumos },
    { label: 'Clientes únicos',    value: fmtNum(summary.unique_clients),        Icon: IconClientes },
    { label: 'Puntos acreditados', value: fmtNum(summary.total_points_credited), Icon: IconPuntosAcreditados },
    { label: 'Puntos canjeados',   value: fmtNum(summary.total_points_redeemed), Icon: IconPuntosCanjeados },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map(({ label, value, Icon }) => (
        <div
          key={label}
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36, background: 'var(--brand-light)', color: 'var(--brand)' }}
          >
            <div style={{ width: 18, height: 18 }}>
              <Icon />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>
              {label}
            </p>
            <p
              className="text-xl font-bold tabular-nums font-display truncate"
              style={{ color: 'var(--foreground)' }}
            >
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
