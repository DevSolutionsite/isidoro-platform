'use client'

import { useState, type FormEvent, type ReactNode } from 'react'

interface Props {
  action: (formData: FormData) => Promise<{ ok: true } | { ok: false; code: string }>
  errorMessages?: Record<string, string>
  children: ReactNode
}

export function SettingForm({ action, errorMessages = {}, children }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrorCode(null)
    setSaved(false)

    try {
      const formData = new FormData(e.currentTarget)
      const res = await action(formData)
      if (!res.ok) {
        setErrorCode(res.code)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {children}
      {errorCode && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
        >
          {errorMessages[errorCode] ?? errorCode}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          {submitting ? 'Guardando...' : 'Guardar'}
        </button>
        {saved && (
          <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
            ✓ Guardado
          </span>
        )}
      </div>
    </form>
  )
}
