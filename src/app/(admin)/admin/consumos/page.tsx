import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ConsumosFiltros } from '@/components/admin/ConsumosFiltros'
import { formatARS } from '@/lib/utils'

export const metadata: Metadata = { title: 'Consumos — Admin Isidoro' }

const PAGE_SIZE = 30

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default async function ConsumosPage({
  searchParams,
}: {
  searchParams: Promise<{ cashier?: string; from?: string; to?: string; sort?: string; page?: string }>
}) {
  const { cashier, from, to, sort, page } = await searchParams
  const ascending = sort === 'asc'
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  const supabase = await createClient()

  let query = supabase
    .from('consumptions')
    .select('id, amount, points_earned, consumed_at, cashier_id, client_id', { count: 'exact' })
    .order('consumed_at', { ascending })
    .range(offset, offset + PAGE_SIZE - 1)

  if (cashier) query = query.eq('cashier_id', cashier)
  if (from) query = query.gte('consumed_at', `${from}T00:00:00`)
  if (to) query = query.lte('consumed_at', `${to}T23:59:59`)

  const [{ data: consumptions, count }, { data: cajeros }] = await Promise.all([
    query,
    supabase.from('profiles').select('id, full_name').in('role', ['cajero', 'admin']).order('full_name'),
  ])

  const ids = Array.from(new Set((consumptions ?? []).flatMap((c) => [c.cashier_id, c.client_id])))
  const { data: people } = ids.length
    ? await supabase.from('profiles').select('id, full_name').in('id', ids)
    : { data: [] }
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]))

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const baseParams = new URLSearchParams()
  if (cashier) baseParams.set('cashier', cashier)
  if (from) baseParams.set('from', from)
  if (to) baseParams.set('to', to)

  function sortLink(dir: 'asc' | 'desc') {
    const p = new URLSearchParams(baseParams)
    p.set('sort', dir)
    return `/admin/consumos?${p.toString()}`
  }

  function pageLink(n: number) {
    const p = new URLSearchParams(baseParams)
    if (sort) p.set('sort', sort)
    if (n > 1) p.set('page', String(n))
    return `/admin/consumos?${p.toString()}`
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
          Consumos
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {total} operaciones registradas
        </p>
      </div>

      <div className="mb-4">
        <ConsumosFiltros
          cajeros={cajeros ?? []}
          defaultCashier={cashier ?? ''}
          defaultFrom={from ?? ''}
          defaultTo={to ?? ''}
        />
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>
                <Link
                  href={sortLink(ascending ? 'desc' : 'asc')}
                  className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                >
                  Fecha {ascending ? '↑' : '↓'}
                </Link>
              </th>
              {['Cajero', 'Cliente', 'Monto', 'Puntos'].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-medium ${h === 'Monto' || h === 'Puntos' ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(consumptions ?? []).map((c, i) => (
              <tr
                key={c.id}
                style={{
                  background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {formatDateTime(c.consumed_at)}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                  {nameById.get(c.cashier_id) ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                  {nameById.get(c.client_id) ?? '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--brand)' }}>
                  {formatARS(c.amount)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--foreground)' }}>
                  +{c.points_earned}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(consumptions?.length ?? 0) === 0 && (
          <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
            No hay consumos para los filtros seleccionados.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={pageLink(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--border)' }}
              >
                ← Anterior
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={pageLink(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--border)' }}
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
