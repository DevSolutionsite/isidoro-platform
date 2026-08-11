'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatARS } from '@/lib/utils'
import type { RegistrarConsumoResult } from '@/lib/actions/cajero'

const ERROR_MESSAGES: Record<string, string> = {
  amount_too_large: 'El monto supera el máximo permitido por operación.',
  invalid_amount: 'El monto ingresado no es válido.',
  client_not_found: 'El cliente ya no existe — buscalo de nuevo.',
  unauthorized_cashier: 'No tenés permiso para registrar consumos.',
  unknown: 'Error inesperado — intentá de nuevo.',
}

interface RegistrarConsumoFormProps {
  clientId: string
  clientName: string
  pointsPerPeso: number
  maxAmount: number
  action: (clientId: string, formData: FormData) => Promise<RegistrarConsumoResult>
}

export function RegistrarConsumoForm({
  clientId,
  clientName,
  pointsPerPeso,
  maxAmount,
  action,
}: RegistrarConsumoFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ pointsEarned: number } | null>(null)

  // Guard síncrono contra doble-tap: ver comentario equivalente en
  // DivisionCuentaForm — setSubmitting(true) recién se refleja en el
  // próximo render, así que un segundo click puede colarse antes.
  const submittingRef = useRef(false)

  // Se regenera con cada edición de monto o cambio de cliente — cada una
  // representa una operación distinta. Un resubmit del MISMO valor (retry
  // de red, doble-tap) reusa la que ya está en memoria sin cambios, que es
  // justo lo que register_consumption necesita para deduplicar.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  // Cliente distinto = operación distinta: regenerar la key durante el
  // render (patrón recomendado por React para "ajustar estado cuando cambia
  // una prop") en vez de en un efecto, que dispararía un render en cascada.
  const [prevClientId, setPrevClientId] = useState(clientId)
  if (clientId !== prevClientId) {
    setPrevClientId(clientId)
    setIdempotencyKey(crypto.randomUUID())
  }

  function handleAmountChange(value: string) {
    setAmount(value.replace(/\D/g, ''))
    setIdempotencyKey(crypto.randomUUID())
  }

  const parsed = parseInt(amount, 10)
  const exceedsMax = !isNaN(parsed) && parsed > maxAmount
  const pts = !isNaN(parsed) && parsed > 0 && !exceedsMax ? Math.floor(parsed * pointsPerPeso) : 0

  async function handleSubmit() {
    if (submittingRef.current || pts === 0) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError(null)

    try {
      const formData = new FormData()
      formData.set('amount', amount)
      formData.set('notes', notes)
      formData.set('idempotency_key', idempotencyKey)

      const res = await action(clientId, formData)

      if (!res.ok) {
        setSubmitError(ERROR_MESSAGES[res.code] ?? ERROR_MESSAGES.unknown)
        return
      }

      setResult({ pointsEarned: res.data.points_earned })
      router.refresh()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  function reset() {
    setAmount('')
    setNotes('')
    setSubmitError(null)
    setResult(null)
    setIdempotencyKey(crypto.randomUUID())
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl px-5 py-6 text-center animate-confirmado"
          style={{ background: 'rgba(202,158,105,0.12)', border: '1px solid rgba(202,158,105,0.35)' }}
        >
          <p className="text-3xl mb-2">✓</p>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--brand)' }}>
            Consumo registrado
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--foreground)' }}>
            <span className="font-medium">{clientName}</span> recibió{' '}
            <span className="font-bold" style={{ color: 'var(--brand)' }}>
              +{result.pointsEarned} pts
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={reset}
          className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          Registrar otro consumo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Monto */}
      <div>
        <label
          htmlFor="amount"
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Monto consumido (ARS) *
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          disabled={submitting}
          placeholder="Ej: 15000"
          className="w-full rounded-xl px-4 py-3 text-lg font-semibold tabular-nums outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: `1px solid ${exceedsMax ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
            color: 'var(--foreground)',
          }}
        />
        {exceedsMax && (
          <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>
            El monto supera el máximo permitido de {formatARS(maxAmount)}
          </p>
        )}
      </div>

      {/* Preview puntos */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{
          background: pts > 0 ? 'rgba(202,158,105,0.1)' : 'var(--surface)',
          border: `1px solid ${pts > 0 ? 'rgba(202,158,105,0.3)' : 'var(--border)'}`,
          transition: 'all 0.2s',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Puntos a acreditar a {clientName.split(' ')[0]}
        </span>
        <span
          className="text-xl font-bold tabular-nums"
          style={{ color: pts > 0 ? 'var(--brand)' : 'var(--text-muted)' }}
        >
          +{pts} pts
        </span>
      </div>

      {/* Notas */}
      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Notas (opcional)
        </label>
        <input
          id="notes"
          name="notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={submitting}
          placeholder="Ej: Mesa 5, cumpleaños…"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

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
        disabled={pts === 0 || submitting}
        className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        {submitting
          ? 'Registrando...'
          : pts > 0
            ? `Registrar consumo · ${formatARS(parsed)}`
            : 'Registrar consumo'}
      </button>
    </div>
  )
}
