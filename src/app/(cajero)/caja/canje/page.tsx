import type { Metadata } from 'next'
import { confirmarCanje } from '@/lib/actions/cajero'
import { ConfirmarCanjeForm } from '@/components/cajero/ConfirmarCanjeForm'
import { CanjeConfirmadoCard } from '@/components/cajero/CanjeConfirmadoCard'
import { CajaTabs } from '@/components/cajero/CajaTabs'

export const metadata: Metadata = { title: 'Confirmar Canje — Isidoro' }

export default async function CanjePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    done?: string
    reward?: string
    pts?: string
    balance?: string
  }>
}) {
  const { error, done, reward, pts, balance } = await searchParams

  const ptsUsed = pts ? parseInt(pts, 10) : 0
  const newBalance = balance ? parseInt(balance, 10) : 0
  const rewardName = reward ? decodeURIComponent(reward) : 'Recompensa'

  return (
    <div className="space-y-6">
      <CajaTabs active="canje" />

      {done ? (
        <CanjeConfirmadoCard rewardName={rewardName} ptsUsed={ptsUsed} newBalance={newBalance} />
      ) : (
        <div className="space-y-4">
          <h1
            className="text-xl font-semibold font-display"
            style={{ color: 'var(--foreground)' }}
          >
            Confirmar canje
          </h1>
          <ConfirmarCanjeForm action={confirmarCanje} errorCode={error} />
        </div>
      )}
    </div>
  )
}
