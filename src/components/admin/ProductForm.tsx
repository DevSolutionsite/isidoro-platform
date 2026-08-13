'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatARS } from '@/lib/utils'
import { maybeConvertHeicToJpeg } from '@/lib/convertHeic'
import type { Product, Category } from '@/lib/types'
import type { ProductActionState } from '@/lib/actions/admin-products'

interface ProductFormProps {
  product?: Product
  categories: Pick<Category, 'id' | 'name' | 'parent_category_id'>[]
  action: (prevState: ProductActionState, formData: FormData) => Promise<ProductActionState>
  mode: 'create' | 'edit'
  returnQ?: string
  returnCategoria?: string
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

export function ProductForm({ product, categories, action, mode, returnQ, returnCategoria }: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(action, {})
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.image_url ?? null)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    let file = input.files?.[0]
    if (!file) return

    setFileError(null)
    setConverting(true)
    try {
      file = await maybeConvertHeicToJpeg(file)
    } catch {
      setFileError('No se pudo convertir la imagen HEIC. Probá exportarla como JPEG desde el teléfono.')
      setConverting(false)
      input.value = ''
      return
    }
    setConverting(false)

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError('Formato no soportado. Usá PNG, JPEG o WebP.')
      input.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError('La imagen supera el límite de 5MB.')
      input.value = ''
      return
    }

    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(URL.createObjectURL(file))
  }

  const displayError = fileError ?? state.error

  const topLevelCategories = categories.filter((c) => !c.parent_category_id)
  const subcategoriesByParent = new Map<string, typeof categories>()
  for (const cat of categories) {
    if (!cat.parent_category_id) continue
    const list = subcategoriesByParent.get(cat.parent_category_id) ?? []
    list.push(cat)
    subcategoriesByParent.set(cat.parent_category_id, list)
  }

  const cancelFilterParams = new URLSearchParams()
  if (returnQ) cancelFilterParams.set('q', returnQ)
  if (returnCategoria) cancelFilterParams.set('categoria', returnCategoria)
  const cancelFilterQuery = cancelFilterParams.toString()
  const cancelHref = cancelFilterQuery ? `/admin/productos?${cancelFilterQuery}` : '/admin/productos'

  return (
    <form ref={formRef} action={formAction} className="space-y-5 max-w-lg">
      <input type="hidden" name="returnQ" value={returnQ ?? ''} />
      <input type="hidden" name="returnCategoria" value={returnCategoria ?? ''} />
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
          {topLevelCategories.map((cat) => {
            const subcats = subcategoriesByParent.get(cat.id) ?? []
            if (subcats.length === 0) {
              return (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              )
            }
            return (
              <optgroup key={cat.id} label={cat.name}>
                <option value={cat.id}>{cat.name} (sin subcategoría)</option>
                {subcats.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            )
          })}
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
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          defaultValue={product?.price}
          placeholder="Ej: 12500"
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, '')
          }}
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
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          defaultValue={product?.sort_order ?? 0}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, '')
          }}
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
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
          onChange={handleFileChange}
          disabled={converting}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {converting ? 'Convirtiendo imagen…' : 'PNG, JPEG o WebP — máximo 5MB. HEIC (iPhone) se convierte automáticamente.'}
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
          disabled={pending || converting}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {pending ? 'Guardando...' : mode === 'create' ? 'Crear producto' : 'Guardar cambios'}
        </button>
        <Link
          href={cancelHref}
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
