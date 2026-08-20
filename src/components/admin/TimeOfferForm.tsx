'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatARS } from '@/lib/utils'
import { maybeConvertHeicToJpeg } from '@/lib/convertHeic'
import type { TimeOffer, Product } from '@/lib/types'

interface AssociatedProduct {
  product_id: string
  price_override: number | null
}

interface TimeOfferFormProps {
  offer?: TimeOffer
  allProducts: Pick<Product, 'id' | 'name' | 'price' | 'category_id'>[]
  initialAssociations?: AssociatedProduct[]
  action: (formData: FormData) => Promise<void>
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

function toTimeInput(time: string): string {
  return time.slice(0, 5) // 'HH:mm:ss' → 'HH:mm'
}

export function TimeOfferForm({
  offer,
  allProducts,
  initialAssociations = [],
  action,
  mode,
}: TimeOfferFormProps) {
  const [associations, setAssociations] = useState<AssociatedProduct[]>(initialAssociations)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(offer?.image_url ?? null)
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

  const associatedIds = new Set(associations.map((a) => a.product_id))
  const availableToAdd = allProducts.filter((p) => !associatedIds.has(p.id))

  function addProduct() {
    if (!selectedProductId) return
    setAssociations((prev) => [...prev, { product_id: selectedProductId, price_override: null }])
    setSelectedProductId('')
  }

  function removeProduct(productId: string) {
    setAssociations((prev) => prev.filter((a) => a.product_id !== productId))
  }

  function updatePriceOverride(productId: string, value: string) {
    const digits = value.replace(/\D/g, '')
    const parsed = digits === '' ? null : parseFloat(digits)
    setAssociations((prev) =>
      prev.map((a) => (a.product_id === productId ? { ...a, price_override: parsed } : a)),
    )
  }

  return (
    <form action={action} className="space-y-6 max-w-lg">
      {fileError && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
        >
          {fileError}
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
          defaultValue={offer?.name}
          placeholder="Ej: Happy Hour"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className={labelClass} style={labelStyle}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={offer?.description ?? ''}
          placeholder="Visible en la carta para los clientes"
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Horarios */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className={labelClass} style={labelStyle}>
            Hora de inicio *
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            required
            defaultValue={offer ? toTimeInput(offer.start_time) : ''}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="end_time" className={labelClass} style={labelStyle}>
            Hora de fin *
          </label>
          <input
            id="end_time"
            name="end_time"
            type="time"
            required
            defaultValue={offer ? toTimeInput(offer.end_time) : ''}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Imagen */}
      <div>
        <label htmlFor="image_file" className={labelClass} style={labelStyle}>
          Imagen de fondo
        </label>
        <input type="hidden" name="current_image_url" value={offer?.image_url ?? ''} />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- preview de blob: local o URL existente, no pasa por el optimizador
          <img
            src={previewUrl}
            alt=""
            className="mb-2 rounded-lg object-cover"
            style={{ height: 108, width: 192, border: '1px solid var(--border)' }}
          />
        )}
        <input
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
          {converting ? 'Convirtiendo imagen…' : 'PNG, JPEG o WebP — máximo 5MB. HEIC (iPhone) se convierte automáticamente. Opcional — se usa de fondo en la carta.'}
        </p>
      </div>

      {/* Activa */}
      <div className="flex items-center gap-3">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          defaultChecked={offer?.is_active ?? true}
          className="h-4 w-4 accent-brand"
        />
        <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--foreground)' }}>
          Activa
        </label>
      </div>

      {/* Productos asociados */}
      <div>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
          Productos en oferta
        </p>

        {/* Lista de asociaciones */}
        {associations.length > 0 && (
          <ul className="space-y-2 mb-3">
            {associations.map((assoc) => {
              const product = allProducts.find((p) => p.id === assoc.product_id)
              if (!product) return null
              return (
                <li
                  key={assoc.product_id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}
                >
                  {/* Hidden inputs para serializar en formData */}
                  <input type="hidden" name="product_ids" value={assoc.product_id} />
                  <input
                    type="hidden"
                    name="price_overrides"
                    value={assoc.price_override ?? ''}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {product.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Precio original: {formatARS(product.price)}
                    </p>
                  </div>

                  <div className="shrink-0 w-32">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={assoc.price_override ?? ''}
                      onChange={(e) => updatePriceOverride(assoc.product_id, e.target.value)}
                      placeholder="Precio oferta"
                      className="w-full rounded px-2 py-1.5 text-xs outline-none"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                    <p className="text-xs mt-0.5 text-center" style={{ color: 'var(--text-muted)' }}>
                      {assoc.price_override != null
                        ? formatARS(assoc.price_override)
                        : 'Sin descuento'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeProduct(assoc.product_id)}
                    className="text-xs transition-opacity hover:opacity-70 shrink-0"
                    style={{ color: '#dc2626' }}
                  >
                    Quitar
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Agregar producto */}
        {availableToAdd.length > 0 && (
          <div className="flex gap-2">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="">Agregar producto…</option>
              {availableToAdd.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatARS(p.price)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addProduct}
              disabled={!selectedProductId}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
              style={{ background: 'var(--surface-alt)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
            >
              + Agregar
            </button>
          </div>
        )}

        {associations.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Sin productos asociados. La oferta se mostrará como banner general sin precio específico.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={converting}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {mode === 'create' ? 'Crear oferta' : 'Guardar cambios'}
        </button>
        <Link
          href="/admin/ofertas"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
