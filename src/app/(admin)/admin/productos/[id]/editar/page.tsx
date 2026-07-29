import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/admin/ProductForm'
import { updateProduct } from '@/lib/actions/admin-products'

export const metadata: Metadata = { title: 'Editar producto — Admin Isidoro' }

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase
      .from('categories')
      .select('id, name')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
  ])

  if (!product) notFound()

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
          Editar producto
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {product.name}
        </p>
      </div>
      <ProductForm
        product={product}
        categories={categories ?? []}
        action={updateProduct.bind(null, id)}
        mode="edit"
      />
    </div>
  )
}
