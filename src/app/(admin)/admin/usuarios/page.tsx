import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ClientSearch } from '@/components/admin/ClientSearch'
import { SuccessBanner } from '@/components/admin/SuccessBanner'
import { UserRoleForm } from '@/components/admin/UserRoleForm'
import { Suspense } from 'react'

export const metadata: Metadata = { title: 'Usuarios — Admin Isidoro' }

const ERROR_MESSAGES: Record<string, string> = {
  invalid_role: 'Rol inválido.',
  cannot_edit_self: 'No podés cambiar tu propio rol desde acá — pedile a otro admin que lo haga.',
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string; error?: string }>
}) {
  const { q, success, error } = await searchParams
  const query = q?.trim() ?? ''
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? decodeURIComponent(error)) : null

  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Sin búsqueda: solo staff actual (cajero/admin) — la lista relevante del día a día.
  // Con búsqueda: cualquier usuario por nombre/teléfono, para poder ascender un cliente.
  const profilesQuery = query
    ? supabase
        .from('profiles')
        .select('id, full_name, phone, role')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('full_name', { ascending: true })
    : supabase
        .from('profiles')
        .select('id, full_name, phone, role')
        .in('role', ['cajero', 'admin'])
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })

  const { data: profiles } = await profilesQuery
  const userList = profiles ?? []

  return (
    <div>
      <SuccessBanner type={success} />
      {errorMessage && (
        <div
          className="px-6 py-3 text-sm font-medium"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderBottom: '1px solid rgba(220,38,38,0.3)' }}
        >
          {errorMessage}
        </div>
      )}

      <div className="px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
            Usuarios
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {query
              ? `Resultados para "${query}"`
              : 'Staff actual (cajeros y admins). Buscá por nombre o teléfono para ascender a un cliente.'}
          </p>
        </div>

        <div className="mb-4">
          <Suspense>
            <ClientSearch defaultValue={q ?? ''} />
          </Suspense>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Nombre', 'Teléfono', 'Rol'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userList.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--background)' : 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                    {u.full_name}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {u.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.id === currentUser?.id ? (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {u.role} <span className="text-xs">(vos)</span>
                      </span>
                    ) : (
                      <UserRoleForm userId={u.id} currentRole={u.role} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {userList.length === 0 && (
            <div className="px-8 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              {query ? (
                <>
                  Sin resultados para <strong style={{ color: 'var(--foreground)' }}>&ldquo;{q}&rdquo;</strong>
                </>
              ) : (
                'No hay cajeros ni admins registrados.'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
