'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { maybeConvertHeicToJpeg } from '@/lib/convertHeic'
import type { Promotion } from '@/lib/types'

interface PromoFormProps {
  promo?: Promotion
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

function toDatetimeLocal(iso: string): string {
  // Converts '2026-06-01T00:00:00Z' → '2026-06-01T00:00' for datetime-local input
  return iso.slice(0, 16)
}

export function PromoForm({ promo, action, mode }: PromoFormProps) {
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(promo?.image_url ?? null)
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

  return (
    <form action={action} className="space-y-5 max-w-lg">
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
          defaultValue={promo?.name}
          placeholder="Ej: 2x1 en empanadas los jueves"
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
          rows={3}
          defaultValue={promo?.description ?? ''}
          placeholder="Detalle visible en la carta para los clientes"
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="valid_from" className={labelClass} style={labelStyle}>
            Válida desde *
          </label>
          <input
            id="valid_from"
            name="valid_from"
            type="datetime-local"
            required
            defaultValue={promo ? toDatetimeLocal(promo.valid_from) : ''}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="valid_until" className={labelClass} style={labelStyle}>
            Válida hasta *
          </label>
          <input
            id="valid_until"
            name="valid_until"
            type="datetime-local"
            required
            defaultValue={promo ? toDatetimeLocal(promo.valid_until) : ''}
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
        <input type="hidden" name="current_image_url" value={promo?.image_url ?? ''} />
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
          defaultChecked={promo?.is_active ?? true}
          className="h-4 w-4 rounded accent-brand"
        />
        <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--foreground)' }}>
          Activa
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={converting}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {mode === 'create' ? 'Crear promoción' : 'Guardar cambios'}
        </button>
        <Link
          href="/admin/promociones"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
