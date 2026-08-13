import type { Metadata } from 'next'
import Link from 'next/link'
import { getCachedCategories } from '@/lib/data/categories'
import { ProductForm } from '@/components/admin/ProductForm'
import { createProduct } from '@/lib/actions/admin-products'

export const metadata: Metadata = { title: 'Nuevo producto — Admin Isidoro' }

export default async function NuevoProductoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>
}) {
  const { q, categoria } = await searchParams
  const categories = await getCachedCategories()

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
          Nuevo producto
        </h1>
      </div>
      <ProductForm
        categories={categories ?? []}
        action={createProduct}
        mode="create"
        returnQ={q ?? ''}
        returnCategoria={categoria ?? ''}
      />
    </div>
  )
}
