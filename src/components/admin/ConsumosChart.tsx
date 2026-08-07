import type { ReportConsumptionByDay } from '@/lib/types'

interface Props {
  data: ReportConsumptionByDay[]
}

const W      = 600
const H      = 180
const PAD_L  = 52
const PAD_B  = 28
const PAD_T  = 12
const PAD_R  = 8

export function ConsumosChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-32 text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        Sin datos para el período
      </div>
    )
  }

  const chartW    = W - PAD_L - PAD_R
  const chartH    = H - PAD_T - PAD_B
  const maxAmount = Math.max(...data.map((d) => d.total_amount), 1)
  const barSlot   = chartW / data.length
  const gap       = Math.max(barSlot * 0.25, 1)
  const barW      = barSlot - gap

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: maxAmount * t,
    y:   PAD_T + chartH - chartH * t,
  }))

  const labelStep = Math.ceil(data.length / 8)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 180 }}
      aria-label="Facturación diaria"
    >
      {/* Grid + Y labels */}
      {yTicks.map(({ val, y }, i) => (
        <g key={i}>
          <line
            x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
            stroke="#ffffff18" strokeWidth={0.5}
          />
          <text x={PAD_L - 6} y={y + 3.5} textAnchor="end" fontSize={8} fill="#9ca3af">
            {val === 0 ? '0' : `$${(val / 1000).toFixed(0)}k`}
          </text>
        </g>
      ))}

      {/* Bars + X labels */}
      {data.map((d, i) => {
        const isEmpty  = d.total_amount === 0
        const barH     = isEmpty ? 3 : Math.max((d.total_amount / maxAmount) * chartH, 2)
        const x        = PAD_L + i * barSlot + gap / 2
        const y        = PAD_T + chartH - barH
        const showDate = data.length <= 10 || i === 0 || i === data.length - 1 || i % labelStep === 0
        const label    = d.date.slice(5).replace('-', '/')
        return (
          <g key={d.date}>
            <title>{`${label}: ${isEmpty ? 'sin actividad' : `$${d.total_amount.toLocaleString('es-AR')}`}`}</title>
            <rect
              x={x} y={y} width={barW} height={barH} rx={2}
              fill={isEmpty ? '#3a5545' : '#ca9e69'}
              opacity={isEmpty ? 0.6 : 0.85}
            />
            {showDate && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={7.5} fill="#9ca3af">
                {label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
