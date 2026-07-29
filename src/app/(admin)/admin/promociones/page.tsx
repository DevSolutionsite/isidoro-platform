import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SuccessBanner } from '@/components/admin/SuccessBanner'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deletePromotion } from '@/lib/actions/admin-promotions'
import type { Promotion } from '@/lib/types'

export const metadata: Metadata = { title: 'Promociones — Admin Isidoro' }

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

function promoStatus(promo: Promotion): { label: string; active: boolean } {
  if (!promo.is_active) return { label: 'Inactiva', active: false }
  const now = new Date()
  const from = new Date(promo.valid_from)
  const until = new Date(promo.valid_until)
  if (now < from) return { label: 'Próxima', active: false }
  if (now > until) return { label: 'Vencida', active: false }
  return { label: 'Activa', active: true }
}

export default async function PromocionesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams

  const supabase = await createClient()
  const { data } = await supabase
    .from('promotions')
    .select('*')
    .order('valid_from', { ascending: false })

  const promos = data ?? []

  return (
    <div>
      <SuccessBanner type={success} />
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
              Promociones
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Descuentos por fecha (ej: 2x1 los jueves)
            </p>
          </div>
          <Link
            href="/admin/promociones/nueva"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            + Nueva promoción
          </Link>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Nombre', 'Desde', 'Hasta', 'Estado', 'Acciones'].map((h) => (
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
              {promos.map((promo, i) => {
                const status = promoStatus(promo)
                return (
                  <tr
                    key={promo.id}
                    style={{
                      background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                      {promo.name}
                      {promo.description && (
                        <p className="text-xs mt-0.5 font-normal line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                          {promo.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(promo.valid_from)}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(promo.valid_until)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={
                          status.active
                            ? { background: 'rgba(202,158,105,0.15)', color: 'var(--brand)' }
                            : { background: 'var(--surface-alt)', color: 'var(--text-muted)' }
                        }
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/admin/promociones/${promo.id}/editar`}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: 'var(--brand)' }}
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deletePromotion.bind(null, promo.id)}
                          label="Eliminar"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {promos.length === 0 && (
            <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No hay promociones.{' '}
              <Link href="/admin/promociones/nueva" style={{ color: 'var(--brand)' }}>
                Crear la primera
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
