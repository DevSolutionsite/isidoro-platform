import type { Metadata } from 'next'
import { confirmarCanje } from '@/lib/actions/cajero'
import { ConfirmarCanjeForm } from '@/components/cajero/ConfirmarCanjeForm'
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
        <div className="space-y-4">
          {/* Success card */}
          <div
            className="rounded-2xl px-5 py-6 text-center"
            style={{
              background: 'rgba(202,158,105,0.12)',
              border: '1px solid rgba(202,158,105,0.35)',
            }}
          >
            <p className="text-3xl mb-2">✓</p>
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--brand)' }}>
              Canje confirmado
            </p>
            <p className="text-base font-bold mt-2" style={{ color: 'var(--foreground)' }}>
              {rewardName}
            </p>
            <div className="mt-5 flex justify-center gap-10">
              <div className="text-center">
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: '#f87171' }}
                >
                  −{ptsUsed}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  puntos usados
                </p>
              </div>
              <div className="text-center">
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: 'var(--brand)' }}
                >
                  {newBalance}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  saldo nuevo
                </p>
              </div>
            </div>
          </div>

          <a
            href="/caja/canje"
            className="block w-full rounded-xl py-3.5 text-sm font-semibold text-center transition-opacity hover:opacity-80"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          >
            Confirmar otro canje
          </a>
        </div>
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
