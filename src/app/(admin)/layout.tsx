import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'
import { IsidoroLogo } from '@/components/IsidoroLogo'

async function logout() {
  'use server'
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) console.error('[logout] signOut error:', error.message)

  // signOut() puede fallar silenciosamente sin limpiar cookies
  // (ver: sessionError / admin.signOut error paths en auth-js).
  // Forzamos borrado de cookies sb-* como defensa adicional.
  const cookieStore = await cookies()
  cookieStore.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-')) cookieStore.delete(cookie.name)
  })

  redirect('/carta')
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-60 shrink-0 border-r"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center py-6 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <IsidoroLogo height={52} />
        </div>

        {/* Nav */}
        <AdminNav />

        {/* Footer */}
        <div
          className="mt-auto px-4 py-4 border-t text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <p className="truncate font-medium">{profile.full_name}</p>
          <p className="mt-0.5 opacity-60">Administrador</p>
          <Link
            href="/carta"
            className="mt-3 flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--brand)' }}
          >
            ← Ver carta
          </Link>
          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
