'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { Reward } from '@/lib/types'
import { iniciarCanje } from '@/lib/actions/perfil'

const CANJE_ERROR_MESSAGES: Record<string, string> = {
  insufficient_points: 'No tenés suficientes puntos para esta recompensa',
  out_of_stock:        'Sin stock disponible para esta recompensa',
  reward_inactive:     'Esta recompensa ya no está disponible',
  reward_not_found:    'Recompensa no encontrada',
  unknown:             'Error inesperado — intentá de nuevo',
}

type Props = {
  rewards:    Reward[]
  totalPoints: number
  errorCode?:  string
}

// useFormStatus solo ve el pending de SU form (el que se tocó). El prop
// `locked` cubre el caso de otro botón: si ya hay un canje de OTRA reward
// en vuelo, este botón también se deshabilita para evitar que un segundo
// tap dispare un segundo canje mientras el primero todavía viaja.
function SubmitButton({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || locked}
      className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-30"
      style={{
        background: 'var(--brand-dark)',
        color:      'var(--background)',
      }}
    >
      {pending ? 'Canjeando...' : 'Canjear'}
    </button>
  )
}

export function RewardsList({ rewards, totalPoints, errorCode }: Props) {
  const [pendingRewardId, setPendingRewardId] = useState<string | null>(null)

  const errorMsg = errorCode
    ? (CANJE_ERROR_MESSAGES[errorCode] ?? CANJE_ERROR_MESSAGES.unknown)
    : null

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: 'var(--brand-light)',
        border:     '1px solid var(--brand)',
      }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--brand-dark)' }}>
        Podés canjear ahora
      </p>

      {errorMsg && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border:     '1px solid rgba(239,68,68,0.30)',
            color:      '#f87171',
          }}
        >
          {errorMsg}
        </div>
      )}

      <ul className="space-y-3">
        {rewards.map((reward) => {
          const canAfford = totalPoints >= reward.points_cost
          return (
            <li key={reward.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{reward.name}</p>
                {reward.description && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {reward.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{
                    background: 'var(--brand)',
                    color:      'var(--background)',
                  }}
                >
                  {reward.points_cost} pts
                </span>

                {canAfford && (
                  <form
                    action={iniciarCanje}
                    onSubmit={() => setPendingRewardId(reward.id)}
                  >
                    <input type="hidden" name="reward_id"   value={reward.id} />
                    <input type="hidden" name="reward_name" value={reward.name} />
                    <SubmitButton
                      locked={pendingRewardId !== null && pendingRewardId !== reward.id}
                    />
                  </form>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
