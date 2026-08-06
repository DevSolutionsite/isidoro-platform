'use client'

import { useEffect, useState } from 'react'
import { formatARS } from '@/lib/utils'

interface RegistrarConsumoFormProps {
  clientId: string
  clientName: string
  pointsPerPeso: number
  action: (formData: FormData) => Promise<void>
}

export function RegistrarConsumoForm({
  clientId,
  clientName,
  pointsPerPeso,
  action,
}: RegistrarConsumoFormProps) {
  const [amount, setAmount] = useState('')

  // Se regenera con cada edición de monto o cambio de cliente — cada una
  // representa una operación distinta. Un resubmit del MISMO valor (retry
  // de red, doble-tap) reusa la que ya está en el hidden input sin cambios,
  // que es justo lo que register_consumption necesita para deduplicar.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID())
  }, [clientId])

  function handleAmountChange(value: string) {
    setAmount(value.replace(/\D/g, ''))
    setIdempotencyKey(crypto.randomUUID())
  }

  const parsed = parseInt(amount, 10)
  const pts = !isNaN(parsed) && parsed > 0 ? Math.floor(parsed * pointsPerPeso) : 0

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="idempotency_key" value={idempotencyKey} />

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
          placeholder="Ej: 15000"
          className="w-full rounded-xl px-4 py-3 text-lg font-semibold tabular-nums outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
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
          placeholder="Ej: Mesa 5, cumpleaños…"
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={pts === 0}
        className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        {pts > 0
          ? `Registrar consumo · ${formatARS(parsed)}`
          : 'Registrar consumo'}
      </button>
    </form>
  )
}
