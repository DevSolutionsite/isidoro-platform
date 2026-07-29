'use client'

import { useState } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  insufficient_points: 'Saldo insuficiente para aplicar este descuento',
  invalid_points: 'El valor de puntos ingresado no es válido',
  missing_client_id: 'Cliente inválido',
  client_not_found: 'Cliente no encontrado',
  insufficient_role: 'No tenés permiso para hacer este ajuste',
  unauthorized: 'No tenés permiso para hacer este ajuste',
  unknown: 'Error inesperado — intentá de nuevo',
}

interface PointsAdjustFormProps {
  action: (formData: FormData) => Promise<void>
  errorCode?: string
}

export function PointsAdjustForm({ action, errorCode }: PointsAdjustFormProps) {
  const [points, setPoints] = useState('')

  const parsed = points === '' ? 0 : parseInt(points, 10)
  const isPositive = parsed > 0
  const isNegative = parsed < 0
  const errorMsg = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown) : null

  return (
    <form action={action} className="space-y-4">
      {errorMsg && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#f87171',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div>
        <label
          htmlFor="points"
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Puntos *{' '}
          <span className="font-normal">
            (positivo para sumar, negativo para restar)
          </span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="points"
            name="points"
            type="number"
            required
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Ej: 50 o -20"
            className="w-40 rounded-lg px-3 py-2 text-sm outline-none transition-colors tabular-nums"
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              color: isPositive
                ? 'var(--brand)'
                : isNegative
                ? '#dc2626'
                : 'var(--foreground)',
            }}
          />
          {parsed !== 0 && (
            <span
              className="text-sm font-semibold"
              style={{ color: isPositive ? 'var(--brand)' : '#dc2626' }}
            >
              {isPositive ? `+${parsed}` : parsed} pts
            </span>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="note"
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Nota / motivo *
        </label>
        <input
          id="note"
          name="note"
          type="text"
          required
          placeholder="Ej: Corrección por error de caja, cortesía, etc."
          className="w-full max-w-md rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={parsed === 0 || points === ''}
        className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        Aplicar ajuste
      </button>
    </form>
  )
}
