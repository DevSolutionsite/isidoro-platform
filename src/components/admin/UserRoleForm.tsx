'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserRole } from '@/lib/actions/admin-users'

const ROLE_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  cajero: 'Cajero',
  admin: 'Admin',
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_role: 'Rol inválido.',
  cannot_edit_self: 'No podés cambiar tu propio rol desde acá — pedile a otro admin que lo haga.',
  unknown: 'Error inesperado — intentá de nuevo.',
}

interface UserRoleFormProps {
  userId: string
  currentRole: string
}

export function UserRoleForm({ userId, currentRole }: UserRoleFormProps) {
  const router = useRouter()
  const [role, setRole] = useState(currentRole)
  const [pending, setPending] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const dirty = role !== currentRole

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending || !dirty) return
    setPending(true)
    setErrorCode(null)

    try {
      const formData = new FormData()
      formData.set('role', role)
      const res = await updateUserRole(userId, formData)

      if (!res.ok) {
        setErrorCode(res.code)
        return
      }

      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const errorMsg = errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown) : null

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={pending}
          className="rounded-lg px-2.5 py-1.5 text-xs outline-none transition-colors"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {dirty && (
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: 'var(--brand)' }}
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
        )}
      </form>
      {errorMsg && (
        <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>
          {errorMsg}
        </p>
      )}
    </div>
  )
}
