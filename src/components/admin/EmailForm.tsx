'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { buildPromotionalEmailHtml } from '@/lib/email/promotionalTemplate'
import { getSiteUrl } from '@/lib/constants'
import { maybeConvertHeicToJpeg } from '@/lib/convertHeic'
import type { EmailActionState } from '@/lib/actions/admin-email'

interface EmailFormProps {
  action: (prevState: EmailActionState, formData: FormData) => Promise<EmailActionState>
  eligibleCount: number
  eligibleNames: string[]
}

type RecipientMode = 'all' | 'email'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MODE_LABELS: Record<RecipientMode, string> = {
  all: 'Todos los clientes que aceptaron',
  email: 'Email suelto',
}

const inputClass = 'w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors'
const inputStyle = {
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}
const labelClass = 'block text-xs font-medium mb-1.5'
const labelStyle = { color: 'var(--text-muted)' }

export function EmailForm({ action, eligibleCount, eligibleNames }: EmailFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState<EmailActionState, FormData>(action, {})

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [converting, setConverting] = useState(false)
  const [mode, setMode] = useState<RecipientMode>('all')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [lastHandledResult, setLastHandledResult] = useState<EmailActionState['result']>(undefined)
  const [debouncedSubject, setDebouncedSubject] = useState('')
  const [debouncedBody, setDebouncedBody] = useState('')

  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

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

    if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
  }

  function handleRemoveImage() {
    if (imageUrl && imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleResetForm() {
    handleRemoveImage()
    setSubject('')
    setBody('')
    setMode('all')
    setRecipientEmail('')
  }

  // Reset del form tras envío exitoso: ajuste de estado durante el render
  // (patrón recomendado por React) en vez de un efecto, para no encadenar
  // setState síncronos dentro de un useEffect. La revocación del blob queda
  // a cargo del efecto de cleanup de arriba (se dispara solo al cambiar imageUrl).
  if (state.result && state.result !== lastHandledResult) {
    setLastHandledResult(state.result)
    setSubject('')
    setBody('')
    setImageUrl(null)
    setFileError(null)
    setMode('all')
    setRecipientEmail('')
    setFileInputKey((k) => k + 1)
  }

  const canSubmit =
    mode === 'all' ? eligibleCount > 0 : EMAIL_REGEX.test(recipientEmail.trim())

  const confirmLabel =
    mode === 'all'
      ? `¿Enviar este mail a ${eligibleCount} clientes?`
      : `¿Enviar este mail a ${recipientEmail.trim()}?`

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSubject(subject)
      setDebouncedBody(body)
    }, 400)
    return () => clearTimeout(t)
  }, [subject, body])

  const previewHtml = useMemo(
    () =>
      buildPromotionalEmailHtml({
        subject: debouncedSubject || 'Asunto del mail',
        body: debouncedBody || 'El cuerpo del mail aparece acá.',
        imageUrl,
        unsubscribeUrl: `${getSiteUrl()}/unsubscribe?token=preview`,
        showUnsubscribe: mode !== 'email',
      }),
    [debouncedSubject, debouncedBody, imageUrl, mode]
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
            {state.result.eligible === 1
              ? 'Mail enviado correctamente.'
              : `Enviados ${state.result.sent} de ${state.result.eligible} clientes elegibles${
                  state.result.failed > 0 ? ` (${state.result.failed} fallaron)` : ''
                }.`}
          </div>
        )}

        <div>
          <label className={labelClass} style={labelStyle}>
            Destinatario
          </label>
          <input type="hidden" name="recipient_mode" value={mode} />
          <div className="flex gap-2 rounded-lg p-1" style={{ background: 'var(--surface-alt)' }}>
            {(Object.keys(MODE_LABELS) as RecipientMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={
                  mode === m
                    ? { background: 'var(--brand)', color: 'var(--background)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {mode === 'email' && (
            <input
              type="email"
              name="recipient_email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              className={`mt-3 ${inputClass}`}
              style={inputStyle}
            />
          )}

          {mode === 'all' && eligibleNames.length > 0 && (
            <details className="mt-3 rounded-lg" style={{ border: '1px solid var(--border)' }}>
              <summary
                className="cursor-pointer px-3 py-2 text-xs font-medium select-none"
                style={{ color: 'var(--text-muted)' }}
              >
                Ver lista de destinatarios ({eligibleNames.length})
              </summary>
              <ul
                className="max-h-48 overflow-y-auto px-3 pb-2 text-xs space-y-1"
                style={{ color: 'var(--foreground)' }}
              >
                {eligibleNames.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </details>
          )}
        </div>

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
          {imageUrl && (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview de blob: local, no pasa por el optimizador */}
              <img
                src={imageUrl}
                alt=""
                className="rounded-lg object-cover"
                style={{ height: 72, width: 72, border: '1px solid var(--border)' }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                Quitar imagen
              </button>
            </div>
          )}
          <input
            key={fileInputKey}
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
            {converting
              ? 'Convirtiendo imagen…'
              : 'PNG, JPEG o WebP — máximo 5MB. HEIC (iPhone) se convierte automáticamente.'}
          </p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={pending || converting || !canSubmit}
            onClick={() => setConfirming(true)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            {pending ? 'Enviando…' : mode === 'all' ? 'Enviar a todos los clientes' : 'Enviar'}
          </button>
          <button
            type="button"
            disabled={pending || converting}
            onClick={handleResetForm}
            className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
          >
            Limpiar formulario
          </button>
        </div>
        <div>
          {mode === 'all' && eligibleCount === 0 && (
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
              {confirmLabel}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {mode === 'all'
                ? 'Es una acción masiva e irreversible. No se puede cancelar el envío una vez iniciado.'
                : 'No se puede cancelar el envío una vez iniciado.'}
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
                {mode === 'all' ? 'Sí, enviar a todos' : 'Sí, enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
