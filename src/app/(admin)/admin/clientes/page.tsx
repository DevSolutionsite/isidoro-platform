import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientSearch } from '@/components/admin/ClientSearch'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Clientes — Admin Isidoro' }

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim().toLowerCase() ?? ''

  const supabase = await createClient()

  const [{ data: profiles }, { data: balances }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone, created_at')
      .eq('role', 'cliente')
      .order('full_name', { ascending: true }),
    supabase.from('points_balance').select('client_id, total_points'),
  ])

  const balanceMap = new Map((balances ?? []).map((b) => [b.client_id, b.total_points]))

  const clients = (profiles ?? [])
    .map((p) => ({ ...p, total_points: balanceMap.get(p.id) ?? null }))
    .filter((c) => {
      if (!query) return true
      return (
        c.full_name.toLowerCase().includes(query) ||
        (c.phone?.toLowerCase().includes(query) ?? false)
      )
    })

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-semibold font-display"
            style={{ color: 'var(--foreground)' }}
          >
            Clientes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {profiles?.length ?? 0} clientes registrados
          </p>
        </div>
      </div>

      <div className="mb-4">
        <Suspense>
          <ClientSearch defaultValue={q ?? ''} />
        </Suspense>
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
            >
              {['Nombre', 'Teléfono', 'Puntos', 'Registrado', ''].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-medium ${!h ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client, i) => (
              <tr
                key={client.id}
                style={{
                  background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                  {client.full_name}
                </td>

                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                  {client.phone ?? '—'}
                </td>

                <td className="px-4 py-3 tabular-nums">
                  {client.total_points != null ? (
                    <span
                      className="font-semibold"
                      style={{
                        color: client.total_points >= 100 ? 'var(--brand)' : 'var(--foreground)',
                      }}
                    >
                      {client.total_points} pts
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Sin puntos
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(client.created_at)}
                </td>

                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/clientes/${client.id}`}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: 'var(--brand)' }}
                  >
                    Ver detalle →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clients.length === 0 && (
          <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
            {query ? (
              <>
                Sin resultados para{' '}
                <strong style={{ color: 'var(--foreground)' }}>&ldquo;{q}&rdquo;</strong>
              </>
            ) : (
              'No hay clientes registrados.'
            )}
          </div>
        )}
      </div>
    </div>
  )
}
