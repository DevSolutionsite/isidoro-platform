'use client'

import Link from 'next/link'
import type { Reward } from '@/lib/types'

interface RewardFormProps {
  reward?: Reward
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

export function RewardForm({ reward, action, mode }: RewardFormProps) {
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
          defaultValue={reward?.name}
          placeholder="Ej: Café gratis"
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
          defaultValue={reward?.description ?? ''}
          placeholder="Detalle visible para el cliente en su perfil"
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Costo en puntos + Stock */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="points_cost" className={labelClass} style={labelStyle}>
            Costo en puntos *
          </label>
          <input
            id="points_cost"
            name="points_cost"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={reward?.points_cost}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="stock" className={labelClass} style={labelStyle}>
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            defaultValue={reward?.stock ?? ''}
            placeholder="Vacío = sin límite"
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
          defaultChecked={reward?.is_active ?? true}
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
          {mode === 'create' ? 'Crear recompensa' : 'Guardar cambios'}
        </button>
        <Link
          href="/admin/recompensas"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
