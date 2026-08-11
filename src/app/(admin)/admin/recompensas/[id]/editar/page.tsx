import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RewardForm } from '@/components/admin/RewardForm'
import { updateReward } from '@/lib/actions/admin-rewards'

export const metadata: Metadata = { title: 'Editar recompensa — Admin Isidoro' }

export default async function EditarRecompensaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
      <RewardForm reward={reward} action={updateReward.bind(null, id)} mode="edit" />
    </div>
  )
}
