'use client'

import { useRef } from 'react'
import { useClienteBusquedaNav } from './useClienteBusquedaNav'

export function BuscarClienteInput({
  defaultValue = '',
  autoFocus = false,
}: {
  defaultValue?: string
  autoFocus?: boolean
}) {
  const search = useClienteBusquedaNav()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (timerRef.current) clearTimeout(timerRef.current)
    const value = e.target.value.trim()
    if (value.length === 1) return
    timerRef.current = setTimeout(() => search(value), 250)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (timerRef.current) clearTimeout(timerRef.current)
    search(e.currentTarget.value.trim())
  }

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Escanear QR o escribir nombre"
      autoComplete="off"
      autoFocus={autoFocus}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
      style={{
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
      }}
    />
  )
}
