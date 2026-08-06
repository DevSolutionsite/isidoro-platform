'use client'

import { useRef, useState } from 'react'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface AddHeroImageFormProps {
  action: (formData: FormData) => Promise<void>
}

export function AddHeroImageForm({ action }: AddHeroImageFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
    setPending(true)
    formRef.current?.requestSubmit()
  }

  return (
    <div>
      {fileError && (
        <p className="mb-2 text-xs font-medium" style={{ color: '#dc2626' }}>
          {fileError}
        </p>
      )}
      <form ref={formRef} action={action} className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          name="image_file"
          accept="image/png,image/jpeg,image/webp"
          required
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {pending ? 'Subiendo…' : '+ Agregar imagen'}
        </button>
      </form>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        PNG, JPEG o WebP — máximo 5MB. Si no cargás ninguna, la landing muestra fotos genéricas de referencia.
      </p>
    </div>
  )
}
