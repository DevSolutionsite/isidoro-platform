import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SuccessBanner } from '@/components/admin/SuccessBanner'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteReward } from '@/lib/actions/admin-rewards'

export const metadata: Metadata = { title: 'Recompensas — Admin Isidoro' }

export default async function RecompensasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams

  const supabase = await createClient()
  const { data } = await supabase
    .from('rewards')
    .select('*')
    .order('points_cost', { ascending: true })

  const rewards = data ?? []

  return (
    <div>
      <SuccessBanner type={success} />
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
              Recompensas
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Canjeables por puntos desde el perfil del cliente
            </p>
          </div>
          <Link
            href="/admin/recompensas/nueva"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            + Nueva recompensa
          </Link>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Nombre', 'Costo en puntos', 'Stock', 'Estado', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 font-medium ${h === 'Acciones' ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward, i) => (
                <tr
                  key={reward.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                    {reward.name}
                    {reward.description && (
                      <p className="text-xs mt-0.5 font-normal line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                        {reward.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {reward.points_cost} pts
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {reward.stock === null ? 'Sin límite' : reward.stock}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        reward.is_active
                          ? { background: 'rgba(202,158,105,0.15)', color: 'var(--brand)' }
                          : { background: 'var(--surface-alt)', color: 'var(--text-muted)' }
                      }
                    >
                      {reward.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/recompensas/${reward.id}/editar`}
                        className="text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--brand)' }}
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteReward.bind(null, reward.id)}
                        label="Eliminar"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rewards.length === 0 && (
            <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No hay recompensas.{' '}
              <Link href="/admin/recompensas/nueva" style={{ color: 'var(--brand)' }}>
                Crear la primera
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
