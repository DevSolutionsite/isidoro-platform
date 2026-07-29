import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { updateCategory } from '@/lib/actions/admin-categories'

export const metadata: Metadata = { title: 'Editar categoría — Admin Isidoro' }

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (!category) notFound()

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
          Editar categoría
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {category.name}
        </p>
      </div>
      <CategoryForm
        category={category}
        action={updateCategory.bind(null, id)}
        mode="edit"
      />
    </div>
  )
}
