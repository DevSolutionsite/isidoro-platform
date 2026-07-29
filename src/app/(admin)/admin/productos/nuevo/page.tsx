import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/admin/ProductForm'
import { createProduct } from '@/lib/actions/admin-products'

export const metadata: Metadata = { title: 'Nuevo producto — Admin Isidoro' }

export default async function NuevoProductoPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <Link
          href="/admin/productos"
          className="text-xs mb-3 inline-block transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Volver a productos
        </Link>
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
          Nuevo producto
        </h1>
      </div>
      <ProductForm categories={categories ?? []} action={createProduct} mode="create" />
    </div>
  )
}
