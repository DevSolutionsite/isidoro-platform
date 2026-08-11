'use client'

import { useRef, useState } from 'react'
import { maybeConvertHeicToJpeg } from '@/lib/convertHeic'
import type { AddHeroImageResult } from '@/lib/actions/admin-site-content'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const ERROR_MESSAGES: Record<string, string> = {
  missing_file: 'Seleccioná una imagen para agregar.',
}

interface AddHeroImageFormProps {
  action: (formData: FormData) => Promise<AddHeroImageResult>
  onAdded: (url: string) => void
}

export function AddHeroImageForm({ action, onAdded }: AddHeroImageFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [converting, setConverting] = useState(false)

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

    setPending(true)
    try {
      const formData = new FormData()
      formData.set('image_file', file)
      const res = await action(formData)
      if (!res.ok) {
        setFileError(ERROR_MESSAGES[res.code] ?? res.code)
        return
      }
      onAdded(res.url)
    } finally {
      setPending(false)
      input.value = ''
    }
  }

  return (
    <div>
      {fileError && (
        <p className="mb-2 text-xs font-medium" style={{ color: '#dc2626' }}>
          {fileError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          name="image_file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
          required
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={pending || converting}
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {converting ? 'Convirtiendo…' : pending ? 'Subiendo…' : '+ Agregar imagen'}
        </button>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        PNG, JPEG o WebP — máximo 5MB. HEIC (iPhone) se convierte automáticamente. Si no cargás ninguna, la landing muestra fotos genéricas de referencia.
      </p>
    </div>
  )
}
