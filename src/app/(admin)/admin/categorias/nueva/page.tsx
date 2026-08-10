import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { createCategory } from '@/lib/actions/admin-categories'

export const metadata: Metadata = { title: 'Nueva categoría — Admin Isidoro' }

export default async function NuevaCategoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>
}) {
  const { parent } = await searchParams
  const supabase = await createClient()

  const { data: topLevelCategories } = await supabase
    .from('categories')
    .select('id, name')
    .is('deleted_at', null)
    .is('parent_category_id', null)
    .order('sort_order', { ascending: true })

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <Link
          href="/admin/categorias"
          className="text-xs mb-3 inline-block transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Volver a categorías
        </Link>
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
          Nueva categoría
        </h1>
      </div>
      <CategoryForm
        topLevelCategories={topLevelCategories ?? []}
        defaultParentId={parent}
        action={createCategory}
        mode="create"
      />
    </div>
  )
}
