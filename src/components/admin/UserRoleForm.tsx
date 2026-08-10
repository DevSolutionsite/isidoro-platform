'use client'

import { useState } from 'react'
import { updateUserRole } from '@/lib/actions/admin-users'

const ROLE_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  cajero: 'Cajero',
  admin: 'Admin',
}

interface UserRoleFormProps {
  userId: string
  currentRole: string
}

export function UserRoleForm({ userId, currentRole }: UserRoleFormProps) {
  const [role, setRole] = useState(currentRole)
  const [pending, setPending] = useState(false)
  const dirty = role !== currentRole

  return (
    <form
      action={async (formData) => {
        setPending(true)
        await updateUserRole(userId, formData)
      }}
      className="flex items-center gap-2"
    >
      <select
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
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
  )
}
