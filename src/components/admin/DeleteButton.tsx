'use client'

import { useState } from 'react'

interface DeleteButtonProps {
  action: () => Promise<void>
  label?: string
}

export function DeleteButton({ action, label = 'Eliminar' }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ¿Confirmar?
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true)
            await action()
          }}
          className="text-xs font-medium px-2 py-1 rounded transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ background: '#dc2626', color: '#fff' }}
        >
          {pending ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs transition-opacity hover:opacity-70"
      style={{ color: '#dc2626' }}
    >
      {label}
    </button>
  )
}
