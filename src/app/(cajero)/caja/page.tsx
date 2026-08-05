import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCachedSettings } from '@/lib/data/settings'
import { RegistrarConsumoForm } from '@/components/cajero/RegistrarConsumoForm'
import { registrarConsumo } from '@/lib/actions/cajero'
import { CajaTabs } from '@/components/cajero/CajaTabs'
import { BuscarClienteInput } from '@/components/cajero/BuscarClienteInput'
import { EscanearQRButtonCaja } from '@/components/cajero/EscanearQRButtonCaja'

export const metadata: Metadata = { title: 'Caja — Isidoro' }

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; clientId?: string; done?: string; pts?: string }>
}) {
  const { q, clientId, done, pts } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createClient()

  const settings = await getCachedSettings()
  const pointsPerPeso = settings?.points_per_peso ?? 1

  // Done client lookup for success banner
  let doneClient: { full_name: string } | null = null
  if (done) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', done)
      .maybeSingle()
    doneClient = data
  }

  // Client search: explicit selection (clientId) > exact QR match > name matches list
  let foundClient: { id: string; full_name: string; phone: string | null } | null = null
  let foundBalance: { total_points: number } | null = null
  let matches: { id: string; full_name: string; phone: string | null }[] = []

  if (clientId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', clientId)
      .eq('role', 'cliente')
      .maybeSingle()
    foundClient = data
  } else if (query) {
    const { data: byQR } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('qr_token', query)
      .eq('role', 'cliente')
      .maybeSingle()

    if (byQR) {
      foundClient = byQR
    } else {
      const { data: byName } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('role', 'cliente')
        .ilike('full_name', `%${query}%`)
        .order('full_name', { ascending: true })
        .limit(8)
      matches = byName ?? []
    }
  }

  if (foundClient) {
    const { data: balance } = await supabase
      .from('points_balance')
      .select('total_points')
      .eq('client_id', foundClient.id)
      .maybeSingle()
    foundBalance = balance
  }

  const ptsEarned = pts ? parseInt(pts, 10) : 0

  return (
    <div className="space-y-6">
      <CajaTabs active="consumo" />

      {/* Success banner */}
      {doneClient && (
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{ background: 'rgba(202,158,105,0.12)', border: '1px solid rgba(202,158,105,0.35)' }}
        >
          <p className="text-2xl mb-1">✓</p>
          <p className="font-semibold text-sm" style={{ color: 'var(--brand)' }}>
            Consumo registrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground)' }}>
            <span className="font-medium">{doneClient.full_name}</span> recibió{' '}
            <span className="font-bold" style={{ color: 'var(--brand)' }}>
              +{ptsEarned} pts
            </span>
          </p>
        </div>
      )}

      {/* Search */}
      <div>
        <h1 className="text-xl font-semibold font-display mb-4" style={{ color: 'var(--foreground)' }}>
          Buscar cliente
        </h1>
        <div className="flex gap-2">
          <div className="flex-1">
            <Suspense>
              <BuscarClienteInput
                defaultValue={foundClient ? foundClient.full_name : query}
                autoFocus={!foundClient}
              />
            </Suspense>
          </div>
          <Suspense>
            <EscanearQRButtonCaja />
          </Suspense>
        </div>
      </div>

      {/* Not found */}
      {query && !foundClient && matches.length === 0 && (
        <div
          className="rounded-2xl px-5 py-6 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="font-medium text-sm mb-1" style={{ color: 'var(--foreground)' }}>
            Cliente no encontrado
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Verificá el QR o el nombre ingresado
          </p>
        </div>
      )}

      {/* Multiple name matches: let the cashier pick the right one */}
      {matches.length > 0 && !foundClient && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {matches.length} coincidencia{matches.length !== 1 ? 's' : ''} — elegí el cliente
          </p>
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/caja?q=${encodeURIComponent(query)}&clientId=${m.id}`}
              className="flex items-center justify-between rounded-2xl px-5 py-3 transition-opacity hover:opacity-80"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                  {m.full_name}
                </p>
                {m.phone && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {m.phone}
                  </p>
                )}
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
                Seleccionar
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Client card + form */}
      {foundClient && (
        <div className="space-y-4">
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
                  {foundClient.full_name}
                </p>
                {foundClient.phone && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {foundClient.phone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p
                  className="text-xl font-bold tabular-nums"
                  style={{ color: 'var(--brand)' }}
                >
                  {foundBalance?.total_points ?? 0}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  puntos actuales
                </p>
              </div>
            </div>
            {clientId && (
              <Link
                href="/caja"
                className="mt-3 inline-block text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                ← Buscar otro cliente
              </Link>
            )}
          </div>

          <div className="border-t" style={{ borderColor: 'var(--border)' }} />

          <RegistrarConsumoForm
            clientId={foundClient.id}
            clientName={foundClient.full_name}
            pointsPerPeso={pointsPerPeso}
            action={registrarConsumo.bind(null, foundClient.id)}
          />
        </div>
      )}

      {/* Empty state */}
      {!query && !doneClient && (
        <div
          className="rounded-2xl px-5 py-10 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="mb-3 mx-auto" style={{ width: 48, height: 48, opacity: 0.3 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2zM16 16h2" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Escaneá el QR del cliente o buscá por nombre
          </p>
        </div>
      )}
    </div>
  )
}
