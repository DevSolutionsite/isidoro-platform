import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SuccessBanner } from '@/components/admin/SuccessBanner'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { deleteCategory } from '@/lib/actions/admin-categories'

export const metadata: Metadata = { title: 'Categorías — Admin Isidoro' }

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams

  const supabase = await createClient()

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('categories').select('*').is('deleted_at', null).order('sort_order', { ascending: true }),
    supabase.from('products').select('category_id').is('deleted_at', null),
  ])

  const categoryList = categories ?? []
  const topLevel = categoryList.filter((c) => !c.parent_category_id)
  const subcategoriesByParent = new Map<string, typeof categoryList>()
  for (const cat of categoryList) {
    if (!cat.parent_category_id) continue
    const list = subcategoriesByParent.get(cat.parent_category_id) ?? []
    list.push(cat)
    subcategoriesByParent.set(cat.parent_category_id, list)
  }

  // Conteo directo (productos con category_id = esta fila exacta)
  const directCountMap = Object.fromEntries(
    categoryList.map((c) => [
      c.id,
      (products ?? []).filter((p) => p.category_id === c.id).length,
    ]),
  )
  // Conteo total de una categoría de nivel superior: propio + el de todas sus subcategorías,
  // para que coincida con lo que el cliente ve agrupado bajo ese título en /carta.
  function totalCount(categoryId: string): number {
    const own = directCountMap[categoryId] ?? 0
    const subs = subcategoriesByParent.get(categoryId) ?? []
    return own + subs.reduce((sum, s) => sum + (directCountMap[s.id] ?? 0), 0)
  }

  // Filas en orden de despliegue: cada categoría de nivel superior seguida de sus subcategorías.
  const rows = topLevel.flatMap((cat) => [
    { category: cat, isSub: false },
    ...(subcategoriesByParent.get(cat.id) ?? []).map((sub) => ({ category: sub, isSub: true })),
  ])

  return (
    <div>
      <SuccessBanner type={success} />

      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
              Categorías
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {topLevel.length} categoría{topLevel.length !== 1 ? 's' : ''} en carta
              {categoryList.length > topLevel.length && (
                <> · {categoryList.length - topLevel.length} subcategoría{categoryList.length - topLevel.length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
          <Link
            href="/admin/categorias/nueva"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            + Nueva categoría
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
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Orden
                </th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Productos
                </th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ category: cat, isSub }, i) => (
                <tr
                  key={cat.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <td
                    className="px-4 py-3"
                    style={{
                      color: isSub ? 'var(--text-muted)' : 'var(--foreground)',
                      fontWeight: isSub ? 400 : 500,
                      paddingLeft: isSub ? '2.5rem' : undefined,
                    }}
                  >
                    {isSub && '— '}
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {cat.sort_order}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {isSub ? directCountMap[cat.id] ?? 0 : totalCount(cat.id)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      {!isSub && (
                        <Link
                          href={`/admin/categorias/nueva?parent=${cat.id}`}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          + Subcategoría
                        </Link>
                      )}
                      <Link
                        href={`/admin/categorias/${cat.id}/editar`}
                        className="text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--brand)' }}
                      >
                        Editar
                      </Link>
                      <DeleteButton
                        action={deleteCategory.bind(null, cat.id)}
                        label="Eliminar"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {categoryList.length === 0 && (
            <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No hay categorías.{' '}
              <Link href="/admin/categorias/nueva" style={{ color: 'var(--brand)' }}>
                Crear la primera
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
