'use client'

import { useEffect, useRef, useState } from 'react'
import { confirmarCanje, type ConfirmarCanjeResult } from '@/lib/actions/cajero'
import { CanjeConfirmadoCard } from './CanjeConfirmadoCard'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code_format: 'Código inválido — solo 6 dígitos numéricos',
  invalid_code: 'Código no encontrado — verificá los dígitos',
  code_expired: 'Código vencido — el cliente debe generar uno nuevo desde su perfil',
  insufficient_points: 'Puntos insuficientes para completar el canje',
  out_of_stock: 'Sin stock disponible para esta recompensa',
  unknown: 'Error inesperado — intentá de nuevo',
}

export function ConfirmarCanjeForm() {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])

  const isFull = digits.every((d) => d !== '')
  const submittedRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<Extract<ConfirmarCanjeResult, { ok: true }>['data'] | null>(
    null
  )

  // Auto-submit once all 6 digits are filled. Runs after React commits the
  // digits state, mismo fix que el auto-submit original (26 jul 2026).
  useEffect(() => {
    if (isFull && !submittedRef.current) {
      submittedRef.current = true
      handleSubmit()
    }
    if (!isFull) {
      submittedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFull])

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const code = digits.join('')
      const res = await confirmarCanje(code)

      if (!res.ok) {
        setSubmitError(ERROR_MESSAGES[res.code] ?? ERROR_MESSAGES.unknown)
        setDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      setResult(res.data)
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setDigits(['', '', '', '', '', ''])
    setSubmitError(null)
    setResult(null)
    submittedRef.current = false
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

  if (result) {
    return (
      <CanjeConfirmadoCard
        rewardName={result.reward_name}
        ptsUsed={result.points_used}
        newBalance={result.client_new_balance}
        onConfirmarOtro={reset}
      />
    )
  }

  return (
    <div className="space-y-6">
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
      {submitError && (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#f87171',
          }}
        >
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isFull || submitting}
        className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        {submitting ? 'Confirmando...' : 'Confirmar canje'}
      </button>
    </div>
  )
}
