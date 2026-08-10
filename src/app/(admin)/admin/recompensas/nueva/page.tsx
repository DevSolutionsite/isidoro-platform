import type { Metadata } from 'next'
import Link from 'next/link'
import { RewardForm } from '@/components/admin/RewardForm'
import { createReward } from '@/lib/actions/admin-rewards'

export const metadata: Metadata = { title: 'Nueva recompensa — Admin Isidoro' }

const ERROR_MESSAGES: Record<string, string> = {
  invalid_points_cost: 'Ingresá un costo en puntos válido, mayor a 0.',
  invalid_stock: 'Ingresá un stock válido (0 o más), o dejalo vacío para sin límite.',
}

export default async function NuevaRecompensaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? decodeURIComponent(error)) : null

  return (
    <div className="px-8 py-6">
      <Link
        href="/admin/recompensas"
        className="text-xs mb-4 inline-block transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Volver a recompensas
      </Link>
      <h1 className="text-2xl font-semibold font-display mb-6" style={{ color: 'var(--foreground)' }}>
        Nueva recompensa
      </h1>
      {errorMessage && (
        <div
          className="mb-5 px-4 py-3 rounded-lg text-sm font-medium max-w-lg"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
        >
          {errorMessage}
        </div>
      )}
      <RewardForm action={createReward} mode="create" />
    </div>
  )
}
