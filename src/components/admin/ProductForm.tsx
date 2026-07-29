'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { formatARS } from '@/lib/utils'
import type { Product, Category } from '@/lib/types'

interface ProductFormProps {
  product?: Product
  categories: Pick<Category, 'id' | 'name'>[]
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

export function ProductForm({ product, categories, action, mode }: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={action} className="space-y-5 max-w-lg">
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
          defaultValue={product?.name}
          placeholder="Ej: Bife de chorizo"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="category_id" className={labelClass} style={labelStyle}>
          Categoría *
        </label>
        <select
          id="category_id"
          name="category_id"
          required
          defaultValue={product?.category_id}
          className={inputClass}
          style={inputStyle}
        >
          <option value="">Seleccioná una categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className={labelClass} style={labelStyle}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product?.description ?? ''}
          placeholder="Descripción del producto (opcional)"
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Precio */}
      <div>
        <label htmlFor="price" className={labelClass} style={labelStyle}>
          Precio (ARS) *
        </label>
        <input
          id="price"
          name="price"
          type="number"
          required
          min={0}
          step={1}
          defaultValue={product?.price}
          placeholder="Ej: 12500"
          className={inputClass}
          style={inputStyle}
        />
        {product && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Actual: {formatARS(product.price)}
          </p>
        )}
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
          defaultValue={product?.sort_order ?? 0}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* URL de imagen */}
      <div>
        <label htmlFor="image_url" className={labelClass} style={labelStyle}>
          URL de imagen
        </label>
        <input
          id="image_url"
          name="image_url"
          type="url"
          defaultValue={product?.image_url ?? ''}
          placeholder="https://... (opcional)"
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Pendiente: Kevin debe configurar Supabase Storage para subida de imágenes.
        </p>
      </div>

      {/* Disponible */}
      <div className="flex items-center gap-3">
        <input
          id="is_available"
          name="is_available"
          type="checkbox"
          defaultChecked={product?.is_available ?? true}
          className="h-4 w-4 rounded accent-brand"
        />
        <label htmlFor="is_available" className="text-sm" style={{ color: 'var(--foreground)' }}>
          Disponible en carta
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {mode === 'create' ? 'Crear producto' : 'Guardar cambios'}
        </button>
        <Link
          href="/admin/productos"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
