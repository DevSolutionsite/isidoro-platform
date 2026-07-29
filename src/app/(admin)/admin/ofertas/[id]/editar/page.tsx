import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TimeOfferForm } from '@/components/admin/TimeOfferForm'
import { updateTimeOffer } from '@/lib/actions/admin-time-offers'

export const metadata: Metadata = { title: 'Editar oferta — Admin Isidoro' }

export default async function EditarOfertaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: offer }, { data: associations }, { data: products }] = await Promise.all([
    supabase.from('time_offers').select('*').eq('id', id).single(),
    supabase
      .from('time_offer_products')
      .select('product_id, price_override')
      .eq('time_offer_id', id),
    supabase
      .from('products')
      .select('id, name, price, category_id')
      .order('sort_order', { ascending: true }),
  ])

  if (!offer) notFound()

  const initialAssociations = (associations ?? []).map((a) => ({
    product_id: a.product_id,
    price_override: a.price_override,
  }))

  return (
    <div className="px-8 py-6">
      <Link
        href="/admin/ofertas"
        className="text-xs mb-4 inline-block transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Volver a ofertas
      </Link>
      <h1
        className="text-2xl font-semibold font-display mb-1"
        style={{ color: 'var(--foreground)' }}
      >
        Editar oferta
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {offer.name}
      </p>
      <TimeOfferForm
        offer={offer}
        allProducts={products ?? []}
        initialAssociations={initialAssociations}
        action={updateTimeOffer.bind(null, id)}
        mode="edit"
      />
    </div>
  )
}
