'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const AUTO_CLOSE_MS = 5000

interface Props {
  rewardName: string
  ptsUsed:    number
  newBalance: number
}

export function CanjeConfirmadoCard({ rewardName, ptsUsed, newBalance }: Props) {
  const router = useRouter()

  useEffect(() => {
    const id = setTimeout(() => router.push('/caja/canje'), AUTO_CLOSE_MS)
    return () => clearTimeout(id)
  }, [router])

  return (
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

      <Link
        href="/caja/canje"
        className="block w-full rounded-xl py-3.5 text-sm font-semibold text-center transition-opacity hover:opacity-80"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        Confirmar otro canje
      </Link>
    </div>
  )
}
