import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TimeOfferForm } from '@/components/admin/TimeOfferForm'
import { createTimeOffer } from '@/lib/actions/admin-time-offers'

export const metadata: Metadata = { title: 'Nueva oferta — Admin Isidoro' }

export default async function NuevaOfertaPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, category_id')
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

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
        className="text-2xl font-semibold font-display mb-6"
        style={{ color: 'var(--foreground)' }}
      >
        Nueva oferta por horario
      </h1>
      <TimeOfferForm allProducts={products ?? []} action={createTimeOffer} mode="create" />
    </div>
  )
}
