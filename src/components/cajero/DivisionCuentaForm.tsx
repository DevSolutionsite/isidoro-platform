'use client'

import { useRef, useState } from 'react'
import { formatARS } from '@/lib/utils'
import {
  buscarClienteParaDivision,
  dividirCuenta,
  type ClienteBusqueda,
} from '@/lib/actions/cajero'
import type { SplitConsumptionEntry } from '@/lib/types'
import { EscanearQRButton } from './EscanearQRButton'

const ERROR_MESSAGES: Record<string, string> = {
  insufficient_splits: 'Se necesitan al menos 2 clientes para dividir la cuenta',
  invalid_client_id: 'Cliente inválido — probá buscarlo de nuevo',
  invalid_amount: 'Uno de los montos ingresados no es válido',
  duplicate_client_id: 'Hay un cliente repetido en la división',
  amount_mismatch: 'La suma de los montos no coincide con el total de la mesa',
  client_not_found: 'Uno de los clientes ya no existe — quitalo de la lista',
  insufficient_role: 'No tenés permiso para dividir cuentas',
  unknown: 'Error inesperado — intentá de nuevo',
}

type SplitRow = ClienteBusqueda & { amount: string }
type ResultRow = SplitConsumptionEntry & { full_name: string }

interface Props {
  pointsPerPeso: number
}

export function DivisionCuentaForm({ pointsPerPeso }: Props) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ClienteBusqueda | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [rows, setRows] = useState<SplitRow[]>([])
  const [totalAmount, setTotalAmount] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ sessionId: string; rows: ResultRow[] } | null>(null)

  const sum = rows.reduce((acc, r) => {
    const n = parseFloat(r.amount)
    return acc + (isNaN(n) ? 0 : n)
  }, 0)

  const parsedTotal = totalAmount ? parseFloat(totalAmount) : null
  const mismatch =
    parsedTotal !== null && !isNaN(parsedTotal) && sum > 0 && Math.abs(parsedTotal - sum) > 0.01

  const allAmountsValid = rows.every((r) => {
    const n = parseFloat(r.amount)
    return !isNaN(n) && n > 0
  })
  const canSubmit = rows.length >= 2 && allAmountsValid && !mismatch && !submitting

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    setSearchError(null)

    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setPreview(null)
      setSearching(false)
      return
    }

    setSearching(true)
    timerRef.current = setTimeout(async () => {
      const found = await buscarClienteParaDivision(trimmed)
      setPreview(found)
      setSearchError(found ? null : 'Cliente no encontrado')
      setSearching(false)
    }, 250)
  }

  function addFound(found: ClienteBusqueda) {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (rows.some((r) => r.id === found.id)) {
      setSearchError('Ya está en la división')
      return
    }
    setRows((prev) => [...prev, { ...found, amount: '' }])
    setQuery('')
    setPreview(null)
    setSearchError(null)
    setSearching(false)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()

    if (timerRef.current) clearTimeout(timerRef.current)

    if (preview) {
      addFound(preview)
      return
    }

    const trimmed = query.trim()
    if (!trimmed) return

    setSearching(true)
    setSearchError(null)

    const found = await buscarClienteParaDivision(trimmed)
    setSearching(false)

    if (!found) {
      setSearchError('Cliente no encontrado')
      return
    }

    addFound(found)
  }

  async function handleQrDecode(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current)

    setSearching(true)
    setSearchError(null)

    const found = await buscarClienteParaDivision(value.trim())
    setSearching(false)

    if (!found) {
      setSearchError('Cliente no encontrado')
      return
    }

    addFound(found)
  }

  function updateAmount(id: string, amount: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, amount } : r)))
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function reset() {
    setRows([])
    setTotalAmount('')
    setQuery('')
    setSearchError(null)
    setSubmitError(null)
    setResult(null)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    const splits = rows.map((r) => ({ client_id: r.id, amount: parseFloat(r.amount) }))
    const namesById = new Map(rows.map((r) => [r.id, r.full_name]))

    const res = await dividirCuenta(splits, parsedTotal ?? undefined)

    if (!res.ok) {
      setSubmitError(ERROR_MESSAGES[res.code] ?? ERROR_MESSAGES.unknown)
      setSubmitting(false)
      return
    }

    setResult({
      sessionId: res.data.session_id,
      rows: res.data.splits.map((s) => ({ ...s, full_name: namesById.get(s.client_id) ?? '—' })),
    })
    setSubmitting(false)
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{ background: 'rgba(202,158,105,0.12)', border: '1px solid rgba(202,158,105,0.35)' }}
        >
          <p className="text-2xl mb-1">✓</p>
          <p className="font-semibold text-sm" style={{ color: 'var(--brand)' }}>
            Cuenta dividida entre {result.rows.length} clientes
          </p>
        </div>

        <div className="space-y-2">
          {result.rows.map((r) => (
            <div
              key={r.client_id}
              className="rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                {r.full_name}
              </p>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--brand)' }}>
                  +{r.points_earned} pts
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  saldo: {r.new_balance}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={reset}
          className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80"
          style={{ background: 'var(--brand)', color: 'var(--background)' }}
        >
          Nueva división
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Búsqueda */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={handleQueryChange}
          placeholder="Escanear QR o escribir nombre"
          autoComplete="off"
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          }}
        />
        <EscanearQRButton onDecode={handleQrDecode} />
      </form>

      {searching && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Buscando...
        </p>
      )}

      {searchError && !searching && (
        <p className="text-sm" style={{ color: '#f87171' }}>
          {searchError}
        </p>
      )}

      {preview && !searching && (
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
              {preview.full_name}
            </p>
            {preview.phone && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {preview.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => addFound(preview)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--brand)', color: 'var(--background)' }}
          >
            Agregar
          </button>
        </div>
      )}

      {/* Lista de clientes agregados */}
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => {
            const n = parseFloat(r.amount)
            const pts = !isNaN(n) && n > 0 ? Math.floor(n * pointsPerPeso) : 0
            return (
              <div
                key={r.id}
                className="rounded-2xl px-4 py-3 space-y-2"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                      {r.full_name}
                    </p>
                    {r.phone && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {r.phone}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    aria-label={`Quitar a ${r.full_name}`}
                    className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    Quitar
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={r.amount}
                    onChange={(e) => updateAmount(r.id, e.target.value.replace(/\D/g, ''))}
                    placeholder="Monto (ARS)"
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums outline-none"
                    style={{
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <span
                    className="text-sm font-semibold tabular-nums whitespace-nowrap"
                    style={{ color: pts > 0 ? 'var(--brand)' : 'var(--text-muted)' }}
                  >
                    +{pts} pts
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total de la mesa (opcional) + suma */}
      {rows.length > 0 && (
        <div className="space-y-2">
          <div>
            <label
              htmlFor="totalAmount"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Monto total de la mesa (opcional, para verificar)
            </label>
            <input
              id="totalAmount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 15000"
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold tabular-nums outline-none"
              style={{
                background: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{
              background: mismatch ? 'rgba(239,68,68,0.10)' : 'var(--surface)',
              border: `1px solid ${mismatch ? 'rgba(239,68,68,0.30)' : 'var(--border)'}`,
            }}
          >
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Total ingresado
            </span>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: mismatch ? '#f87171' : 'var(--foreground)' }}
            >
              {formatARS(sum)}
            </span>
          </div>
          {mismatch && (
            <p className="text-sm" style={{ color: '#f87171' }}>
              No coincide con el total de la mesa ({formatARS(parsedTotal ?? 0)})
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div
          className="rounded-2xl px-5 py-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Agregá al menos 2 clientes para dividir la cuenta
          </p>
        </div>
      )}

      {submitError && (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#f87171',
          }}
        >
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-opacity hover:opacity-80 disabled:opacity-30"
        style={{ background: 'var(--brand)', color: 'var(--background)' }}
      >
        {submitting
          ? 'Dividiendo...'
          : rows.length >= 2
            ? `Dividir cuenta · ${formatARS(sum)}`
            : 'Dividir cuenta'}
      </button>
    </div>
  )
}
