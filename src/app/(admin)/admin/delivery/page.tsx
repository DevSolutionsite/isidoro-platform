import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DeliveryTree } from '@/components/admin/DeliveryTree'

export const metadata: Metadata = { title: 'Delivery — Admin Isidoro' }

export default async function DeliveryPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, sort_order, parent_category_id, available_for_delivery')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, category_id, sort_order, available_for_delivery')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
  ])

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
          Delivery
        </h1>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-muted)' }}>
          Estos controles solo afectan lo que aparece cuando un cliente hace un pedido por
          WhatsApp. No modifican ni ocultan nada de la carta del restaurante.
        </p>
      </div>

      <DeliveryTree categories={categories ?? []} products={products ?? []} />
    </div>
  )
}
