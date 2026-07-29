import type { ReportTopReward } from '@/lib/types'

interface Props {
  rewards: ReportTopReward[]
}

export function TopRecompensasTable({ rewards }: Props) {
  if (rewards.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>
        Sin canjes en el período
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['#', 'Recompensa', 'Canjes', 'Puntos usados'].map((h) => (
              <th
                key={h}
                className={`py-2 text-xs font-medium ${h === '#' || h === 'Recompensa' ? 'text-left pr-4' : 'text-right pr-4 last:pr-0'}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rewards.map((r, i) => (
            <tr key={r.reward_id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="py-2.5 pr-4 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {i + 1}
              </td>
              <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--foreground)' }}>
                {r.reward_name}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                {r.redemption_count}
              </td>
              <td className="py-2.5 text-right tabular-nums" style={{ color: 'var(--brand)' }}>
                {r.total_points_used.toLocaleString('es-AR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
