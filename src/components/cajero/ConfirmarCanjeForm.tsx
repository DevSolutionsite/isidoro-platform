'use client'

import { useEffect, useRef, useState } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code_format: 'Código inválido — solo 6 dígitos numéricos',
  invalid_code: 'Código no encontrado — verificá los dígitos',
  code_expired: 'Código vencido — el cliente debe generar uno nuevo desde su perfil',
  insufficient_points: 'Puntos insuficientes para completar el canje',
  out_of_stock: 'Sin stock disponible para esta recompensa',
  unknown: 'Error inesperado — intentá de nuevo',
}

interface Props {
  action: (formData: FormData) => Promise<void>
  errorCode?: string
}

export function ConfirmarCanjeForm({ action, errorCode }: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])
  const formRef = useRef<HTMLFormElement>(null)

  const isFull = digits.every((d) => d !== '')
  const errorMsg = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown) : null
  const submittedRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)

  // Auto-submit once all 6 digits are filled. Runs after React commits the
  // digits state to the hidden inputs — calling requestSubmit() synchronously
  // inside handleChange raced ahead of that commit and always submitted a
  // stale/incomplete code (bug found during QA, 26 jul 2026).
  useEffect(() => {
    if (isFull && !submittedRef.current) {
      submittedRef.current = true
      formRef.current?.requestSubmit()
    }
    if (!isFull) {
      submittedRef.current = false
    }
  }, [isFull])

  // Guard against a second submit (stray tap, Enter key) firing while the
  // first request is still in flight: it would hit an already-confirmed
  // redemption and show "código no encontrado" even though the first
  // request already deducted the points (bug found 30 jul 2026).
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (submitting) {
      e.preventDefault()
      return
    }
    setSubmitting(true)
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        const next = [...digits]
        next[index - 1] = ''
        setDigits(next)
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-6">
      {/* 6 hidden inputs that carry the actual form values */}
      {digits.map((d, i) => (
        <input key={i} type="hidden" name={`d${i}`} value={d} />
      ))}

      {/* OTP boxes */}
      <div>
        <p className="text-xs font-medium mb-4 text-center" style={{ color: 'var(--text-muted)' }}>
          Ingresá el código de 6 dígitos del cliente
        </p>
        <div className="flex gap-2 justify-center">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]"
              maxLength={2}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={submitting}
              autoFocus={i === 0}
              className="w-12 h-14 text-center text-xl font-bold tabular-nums rounded-xl outline-none"
              style={{
                background: 'var(--surface-alt)',
                border: `2px solid ${digit ? 'var(--brand)' : 'var(--border)'}`,
                color: 'var(--foreground)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#f87171',
          }}
        >
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!isFull || submitting}
        className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        {submitting ? 'Confirmando...' : 'Confirmar canje'}
      </button>
    </form>
  )
}
