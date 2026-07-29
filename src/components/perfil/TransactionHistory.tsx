import type { PointsTransaction } from '@/lib/types'

const TX_LABELS: Record<PointsTransaction['type'], string> = {
  consumption: 'Consumo en Isidoro',
  redemption: 'Canje de recompensa',
  manual_adjustment: 'Ajuste manual',
  expiry: 'Puntos vencidos',
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

type Props = {
  transactions: Pick<PointsTransaction, 'id' | 'type' | 'points' | 'created_at'>[]
}

export function TransactionHistory({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold mb-3">Movimientos</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Todavía no tenés movimientos. ¡Empezá acumulando puntos en tu próxima visita!
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-3">Movimientos</p>
      <ul
        className="rounded-2xl overflow-hidden divide-y"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderColor: 'var(--border)',
        }}
      >
        {transactions.map((tx) => {
          const isPositive = tx.points > 0
          return (
            <li key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{TX_LABELS[tx.type]}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(tx.created_at)}
                </p>
              </div>
              <span
                className="text-sm font-semibold shrink-0 ml-3 tabular-nums"
                style={{
                  color: isPositive
                    ? 'var(--brand)'
                    : tx.type === 'expiry'
                      ? '#DC2626'
                      : 'var(--text-muted)',
                }}
              >
                {isPositive ? '+' : ''}
                {tx.points} pts
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
