import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/utils'
import { SuccessBanner } from '@/components/admin/SuccessBanner'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteProduct } from '@/lib/actions/admin-products'

export const metadata: Metadata = { title: 'Productos — Admin Isidoro' }

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams

  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, price, sort_order, is_available, category_id, categories(name)')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  const productList = products ?? []

  return (
    <div>
      <SuccessBanner type={success} />

      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
              Productos
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {productList.length} producto{productList.length !== 1 ? 's' : ''} en carta
            </p>
          </div>
          <Link
            href="/admin/productos/nuevo"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            + Nuevo producto
          </Link>
        </div>

        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: 'var(--border)' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Nombre
                </th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Categoría
                </th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Precio
                </th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Orden
                </th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Disponible
                </th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productList.map((product, i) => (
                <tr
                  key={product.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                    {product.name}
                    {product.description && (
                      <p className="text-xs mt-0.5 font-normal line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                        {product.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {(product.categories as unknown as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                    {formatARS(product.price)}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {product.sort_order}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        product.is_available
                          ? { background: 'rgba(202,158,105,0.15)', color: 'var(--brand)' }
                          : { background: 'var(--surface-alt)', color: 'var(--text-muted)' }
                      }
                    >
                      {product.is_available ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/productos/${product.id}/editar`}
                        className="text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--brand)' }}
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteProduct.bind(null, product.id)}
                        label="Eliminar"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {productList.length === 0 && (
            <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No hay productos.{' '}
              <Link href="/admin/productos/nuevo" style={{ color: 'var(--brand)' }}>
                Crear el primero
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
