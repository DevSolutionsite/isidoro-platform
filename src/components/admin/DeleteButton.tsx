'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteButtonProps {
  action: () => Promise<{ ok: true } | { ok: false; code: string }>
  label?: string
}

export function DeleteButton({ action, label = 'Eliminar' }: DeleteButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        {error ? (
          <span className="text-xs" style={{ color: '#dc2626' }}>
            {error}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ¿Confirmar?
          </span>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true)
            setError(null)
            try {
              const res = await action()
              if (!res.ok) {
                setError('No se pudo eliminar.')
                return
              }
              setConfirming(false)
              router.refresh()
            } finally {
              setPending(false)
            }
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
