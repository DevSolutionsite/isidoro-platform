import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedCategories } from '@/lib/data/categories'
import { ProductForm } from '@/components/admin/ProductForm'
import { updateProduct } from '@/lib/actions/admin-products'

export const metadata: Metadata = { title: 'Editar producto — Admin Isidoro' }

export default async function EditarProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; categoria?: string }>
}) {
  const { id } = await params
  const { q, categoria } = await searchParams
  const supabase = await createClient()

  const [{ data: product }, categories] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    getCachedCategories(),
  ])

  if (!product) notFound()

  const filterParams = new URLSearchParams()
  if (q) filterParams.set('q', q)
  if (categoria) filterParams.set('categoria', categoria)
  const filterQuery = filterParams.toString()
  const backHref = filterQuery ? `/admin/productos?${filterQuery}` : '/admin/productos'

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <Link
          href={backHref}
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
        returnQ={q ?? ''}
        returnCategoria={categoria ?? ''}
      />
    </div>
  )
}
