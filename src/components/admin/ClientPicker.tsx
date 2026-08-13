'use client'

import { useEffect, useRef, useState } from 'react'
import { searchClients, type ClientSearchResult } from '@/lib/actions/admin-email'

const inputClass = 'w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors'
const inputStyle = {
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

interface ClientPickerProps {
  selected: ClientSearchResult | null
  onSelect: (client: ClientSearchResult | null) => void
}

export function ClientPicker({ selected, onSelect }: ClientPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)

    if (timerRef.current) clearTimeout(timerRef.current)
    if (!value.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      const id = ++requestId.current
      setLoading(true)
      const data = await searchClients(value)
      if (id !== requestId.current) return
      setResults(data)
      setOpen(true)
      setLoading(false)
    }, 250)
  }

  function handlePick(client: ClientSearchResult) {
    onSelect(client)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  if (selected) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
        style={inputStyle}
      >
        <div>
          <span className="font-medium" style={{ color: 'var(--foreground)' }}>
            {selected.full_name}
          </span>
          <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
            {selected.email}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--brand)' }}
        >
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cliente por nombre o teléfono…"
        autoComplete="off"
        className={inputClass}
        style={inputStyle}
      />
      {open && (
        <div
          className="absolute left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-lg shadow-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {loading && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Buscando…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Sin resultados.
            </div>
          )}
          {!loading &&
            results.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handlePick(client)}
                className="block w-full px-3 py-2 text-left text-sm transition-colors hover:opacity-80"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div style={{ color: 'var(--foreground)' }}>
                  {client.full_name}
                  {client.email_opt_out && (
                    <span className="ml-2 text-xs" style={{ color: '#dc2626' }}>
                      (dado de baja)
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {client.email}
                  {client.phone ? ` · ${client.phone}` : ''}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
