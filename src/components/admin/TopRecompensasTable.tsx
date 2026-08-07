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
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
            {['#', 'Recompensa', 'Canjes', 'Puntos usados'].map((h) => (
              <th
                key={h}
                className={`px-3 py-2.5 text-xs font-medium ${h === '#' || h === 'Recompensa' ? 'text-left' : 'text-right'}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rewards.map((r, i) => (
            <tr
              key={r.reward_id}
              style={{
                background: i % 2 === 0 ? 'transparent' : 'var(--surface-alt)',
                borderBottom: i === rewards.length - 1 ? 'none' : '1px solid var(--border)',
              }}
            >
              <td className="px-3 py-2.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {i + 1}
              </td>
              <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--foreground)' }}>
                {r.reward_name}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                {r.redemption_count}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--brand)' }}>
                {r.total_points_used.toLocaleString('es-AR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
