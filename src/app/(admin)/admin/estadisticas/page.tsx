import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ReportsResponse } from '@/lib/types'
import { StatsKPIGrid } from '@/components/admin/StatsKPIGrid'
import { ConsumosChart } from '@/components/admin/ConsumosChart'
import { TopClientesTable } from '@/components/admin/TopClientesTable'
import { TopRecompensasTable } from '@/components/admin/TopRecompensasTable'
import { RangoFechas } from '@/components/admin/RangoFechas'

export const metadata: Metadata = { title: 'Estadísticas — Isidoro Admin' }

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from: fromParam, to: toParam } = await searchParams

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const to = toParam || isoDate(new Date())
  const from = fromParam || isoDate(new Date(new Date(to).getTime() - 30 * 24 * 60 * 60 * 1000))

  const url = new URL(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reports`,
  )
  url.searchParams.set('from', from)
  // El backend trata `to` como límite exclusivo (consumed_at < p_to) — sumamos
  // un día para que el date-picker "Hasta: hoy" incluya las operaciones de hoy.
  const toExclusive = isoDate(new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000))
  url.searchParams.set('to', toExclusive)
  url.searchParams.set('limit', '10')

  let report: ReportsResponse | null = null
  let fetchError: string | null = null

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      next: { revalidate: 60 },
    })
    if (res.ok) {
      report = (await res.json()) as ReportsResponse
    } else {
      const body = await res.json().catch(() => ({}))
      fetchError = (body as { error?: string })?.error ?? `Error ${res.status}`
    }
  } catch {
    fetchError = 'No se pudo conectar con el servidor de reportes'
  }

  const fromLabel = new Date(from).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long',
  })
  const toLabel = new Date(to).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold font-display"
            style={{ color: 'var(--foreground)' }}
          >
            Estadísticas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {fromLabel} — {toLabel}
          </p>
        </div>
        <Suspense>
          <RangoFechas from={from} to={to} />
        </Suspense>
      </div>

      {fetchError ? (
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border:     '1px solid rgba(239,68,68,0.30)',
            color:      '#f87171',
          }}
        >
          {fetchError}
        </div>
      ) : report ? (
        <>
          <StatsKPIGrid summary={report.summary} />

          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Facturación diaria
            </p>
            <ConsumosChart data={report.consumptions_by_day} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Top clientes
              </p>
              <TopClientesTable clients={report.top_clients} />
            </div>

            <div
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Recompensas más canjeadas
              </p>
              <TopRecompensasTable rewards={report.top_rewards} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
