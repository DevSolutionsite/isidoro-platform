import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SuccessBanner } from '@/components/admin/SuccessBanner'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteTimeOffer } from '@/lib/actions/admin-time-offers'

export const metadata: Metadata = { title: 'Ofertas por horario — Admin Isidoro' }

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams

  const supabase = await createClient()
  const { data } = await supabase
    .from('time_offers')
    .select('*, time_offer_products(product_id, products(name))')
    .order('start_time', { ascending: true })

  const offers = data ?? []

  return (
    <div>
      <SuccessBanner type={success} />
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-semibold font-display"
              style={{ color: 'var(--foreground)' }}
            >
              Ofertas por horario
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Happy Hour, almuerzos, precios según franja horaria
            </p>
          </div>
          <Link
            href="/admin/ofertas/nueva"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            + Nueva oferta
          </Link>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Nombre', 'Horario', 'Estado', 'Productos', 'Acciones'].map((h) => (
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
              {offers.map((offer, i) => {
                const productNames = (offer.time_offer_products ?? [])
                  .map((a: { products: { name: string } | null }) => a.products?.name)
                  .filter(Boolean) as string[]

                return (
                  <tr
                    key={offer.id}
                    style={{
                      background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                      {offer.name}
                      {offer.description && (
                        <p
                          className="text-xs mt-0.5 font-normal line-clamp-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {offer.description}
                        </p>
                      )}
                    </td>

                    <td
                      className="px-4 py-3 tabular-nums font-mono text-xs"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {offer.start_time.slice(0, 5)} – {offer.end_time.slice(0, 5)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={
                          offer.is_active
                            ? { background: 'rgba(202,158,105,0.15)', color: 'var(--brand)' }
                            : { background: 'var(--surface-alt)', color: 'var(--text-muted)' }
                        }
                      >
                        {offer.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {productNames.length === 0 ? (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Sin productos
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {productNames.slice(0, 2).join(', ')}
                          {productNames.length > 2 && ` +${productNames.length - 2}`}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/admin/ofertas/${offer.id}/editar`}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: 'var(--brand)' }}
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deleteTimeOffer.bind(null, offer.id)}
                          label="Eliminar"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {offers.length === 0 && (
            <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No hay ofertas.{' '}
              <Link href="/admin/ofertas/nueva" style={{ color: 'var(--brand)' }}>
                Crear la primera
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
