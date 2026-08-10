import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RewardForm } from '@/components/admin/RewardForm'
import { updateReward } from '@/lib/actions/admin-rewards'

export const metadata: Metadata = { title: 'Editar recompensa — Admin Isidoro' }

const ERROR_MESSAGES: Record<string, string> = {
  invalid_points_cost: 'Ingresá un costo en puntos válido, mayor a 0.',
  invalid_stock: 'Ingresá un stock válido (0 o más), o dejalo vacío para sin límite.',
}

export default async function EditarRecompensaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? decodeURIComponent(error)) : null

  const supabase = await createClient()
  const { data: reward } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', id)
    .single()

  if (!reward) notFound()

  return (
    <div className="px-8 py-6">
      <Link
        href="/admin/recompensas"
        className="text-xs mb-4 inline-block transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Volver a recompensas
      </Link>
      <h1 className="text-2xl font-semibold font-display mb-1" style={{ color: 'var(--foreground)' }}>
        Editar recompensa
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{reward.name}</p>
      {errorMessage && (
        <div
          className="mb-5 px-4 py-3 rounded-lg text-sm font-medium max-w-lg"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
        >
          {errorMessage}
        </div>
      )}
      <RewardForm reward={reward} action={updateReward.bind(null, id)} mode="edit" />
    </div>
  )
}
