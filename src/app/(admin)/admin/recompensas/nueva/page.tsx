import type { Metadata } from 'next'
import Link from 'next/link'
import { RewardForm } from '@/components/admin/RewardForm'
import { createReward } from '@/lib/actions/admin-rewards'

export const metadata: Metadata = { title: 'Nueva recompensa — Admin Isidoro' }

export default async function NuevaRecompensaPage() {
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
      <RewardForm action={createReward} mode="create" />
    </div>
  )
}
