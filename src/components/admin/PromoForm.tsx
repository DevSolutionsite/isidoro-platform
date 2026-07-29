'use client'

import Link from 'next/link'
import type { Promotion } from '@/lib/types'

interface PromoFormProps {
  promo?: Promotion
  action: (formData: FormData) => Promise<void>
  mode: 'create' | 'edit'
}

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
  return (
    <form action={action} className="space-y-5 max-w-lg">
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
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
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
