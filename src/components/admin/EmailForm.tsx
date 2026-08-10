'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { buildPromotionalEmailHtml } from '@/lib/email/promotionalTemplate'
import { getSiteUrl } from '@/lib/constants'
import type { EmailActionState } from '@/lib/actions/admin-email'

interface EmailFormProps {
  action: (prevState: EmailActionState, formData: FormData) => Promise<EmailActionState>
  eligibleCount: number
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

export function EmailForm({ action, eligibleCount }: EmailFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState<EmailActionState, FormData>(action, {})

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

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
    if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
  }

  const previewHtml = useMemo(
    () =>
      buildPromotionalEmailHtml({
        subject: subject || 'Asunto del mail',
        body: body || 'El cuerpo del mail aparece acá.',
        imageUrl,
        unsubscribeUrl: `${getSiteUrl()}/unsubscribe?token=preview`,
      }),
    [subject, body, imageUrl]
  )

  const displayError = fileError ?? state.error

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
      <form ref={formRef} action={formAction} className="space-y-5">
        {displayError && (
          <div
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'rgba(220,38,38,0.1)',
              color: '#dc2626',
              border: '1px solid rgba(220,38,38,0.3)',
            }}
          >
            {displayError}
          </div>
        )}

        {state.result && (
          <div
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'var(--brand-light)',
              color: 'var(--brand-dark)',
              border: '1px solid var(--brand)',
            }}
          >
            Enviados {state.result.sent} de {state.result.eligible} clientes elegibles
            {state.result.failed > 0 ? ` (${state.result.failed} fallaron)` : ''}.
          </div>
        )}

        <div>
          <label htmlFor="subject" className={labelClass} style={labelStyle}>
            Asunto *
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: 2x1 en tragos todos los jueves"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="body" className={labelClass} style={labelStyle}>
            Cuerpo *
          </label>
          <textarea
            id="body"
            name="body"
            rows={8}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribí el mensaje del mail…"
            className={inputClass}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <label htmlFor="image_file" className={labelClass} style={labelStyle}>
            Imagen (opcional)
          </label>
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

        <div className="pt-2">
          <button
            type="button"
            disabled={pending || eligibleCount === 0}
            onClick={() => setConfirming(true)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            {pending ? 'Enviando…' : 'Enviar a todos los clientes'}
          </button>
          {eligibleCount === 0 && (
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              No hay clientes elegibles para recibir mails.
            </p>
          )}
        </div>
      </form>

      <div>
        <p className={labelClass} style={labelStyle}>
          Vista previa
        </p>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)', height: 640 }}
        >
          <iframe
            title="Vista previa del mail"
            srcDoc={previewHtml}
            className="w-full h-full"
            style={{ border: 'none', background: '#fff' }}
          />
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              ¿Enviar este mail a {eligibleCount} clientes?
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Es una acción masiva e irreversible. No se puede cancelar el envío una vez
              iniciado.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirming(false)
                  formRef.current?.requestSubmit()
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: '#dc2626', color: '#fff' }}
              >
                Sí, enviar a todos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
