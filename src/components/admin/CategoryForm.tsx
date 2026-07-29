'use client'

import Link from 'next/link'
import type { Category } from '@/lib/types'

interface CategoryFormProps {
  category?: Category
  action: (formData: FormData) => Promise<void>
  mode: 'create' | 'edit'
}

const inputClass = 'w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors'
const inputStyle = {
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}
const labelClass = 'block text-xs font-medium mb-1.5'
const labelStyle = { color: 'var(--text-muted)' }

export function CategoryForm({ category, action, mode }: CategoryFormProps) {
  return (
    <form action={action} className="space-y-5 max-w-sm">
      {/* Nombre */}
      <div>
        <label htmlFor="name" className={labelClass} style={labelStyle}>
          Nombre *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={category?.name}
          placeholder="Ej: Entradas"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Orden */}
      <div>
        <label htmlFor="sort_order" className={labelClass} style={labelStyle}>
          Orden de aparición
        </label>
        <input
          id="sort_order"
          name="sort_order"
          type="number"
          min={0}
          defaultValue={category?.sort_order ?? 0}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Número menor aparece primero en la carta.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {mode === 'create' ? 'Crear categoría' : 'Guardar cambios'}
        </button>
        <Link
          href="/admin/categorias"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
