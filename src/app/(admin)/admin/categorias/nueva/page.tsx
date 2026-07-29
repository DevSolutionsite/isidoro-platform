import type { Metadata } from 'next'
import Link from 'next/link'
import { CategoryForm } from '@/components/admin/CategoryForm'
import { createCategory } from '@/lib/actions/admin-categories'

export const metadata: Metadata = { title: 'Nueva categoría — Admin Isidoro' }

export default function NuevaCategoriaPage() {
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
      <CategoryForm action={createCategory} mode="create" />
    </div>
  )
}
