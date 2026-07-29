type Props = {
  points: number
}

export function PointsCard({ points }: Props) {
  const message =
    points >= 200
      ? '¡Podés canjear varias recompensas!'
      : points >= 80
        ? 'Ya podés canjear tu primera recompensa.'
        : `Te faltan ${80 - points} puntos para tu primer canje.`

  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: 'var(--brand)', color: '#FFFFFF' }}
    >
      <p className="text-sm font-medium uppercase tracking-widest opacity-80">
        Tus puntos
      </p>
      <p
        className="text-7xl font-bold tracking-tight my-3"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {points}
      </p>
      <p className="text-sm opacity-90">{message}</p>
    </div>
  )
}
