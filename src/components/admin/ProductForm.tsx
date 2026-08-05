'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatARS } from '@/lib/utils'
import type { Product, Category } from '@/lib/types'
import type { ProductActionState } from '@/lib/actions/admin-products'

interface ProductFormProps {
  product?: Product
  categories: Pick<Category, 'id' | 'name'>[]
  action: (prevState: ProductActionState, formData: FormData) => Promise<ProductActionState>
  mode: 'create' | 'edit'
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(action, {})
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.image_url ?? null)

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError('Formato no soportado. Usá PNG, JPEG o WebP.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError('La imagen supera el límite de 5MB.')
      e.target.value = ''
      return
    }

    setFileError(null)
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(URL.createObjectURL(file))
  }

  const displayError = fileError ?? state.error

  return (
    <form ref={formRef} action={formAction} className="space-y-5 max-w-lg">
      {displayError && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
        >
          {displayError}
        </div>
      )}
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

      {/* Imagen */}
      <div>
        <label htmlFor="image_file" className={labelClass} style={labelStyle}>
          Imagen
        </label>
        <input type="hidden" name="current_image_url" value={product?.image_url ?? ''} />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- preview de blob: local o URL existente, no pasa por el optimizador
          <img
            src={previewUrl}
            alt=""
            className="mb-2 rounded-lg object-cover"
            style={{ height: 108, width: 108, border: '1px solid var(--border)' }}
          />
        )}
        <input
          ref={fileInputRef}
          id="image_file"
          name="image_file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          PNG, JPEG o WebP — máximo 5MB.
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
          disabled={pending}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {pending ? 'Guardando...' : mode === 'create' ? 'Crear producto' : 'Guardar cambios'}
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
