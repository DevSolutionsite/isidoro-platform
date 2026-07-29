import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IsidoroLogo } from '@/components/IsidoroLogo'

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function ClienteLayout({
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
    .select('role, full_name, dni, phone, city')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin')
  if (profile.role === 'cajero') redirect('/caja')
  if (profile.role !== 'cliente') redirect('/login')
  if (!profile.dni || !profile.phone || !profile.city) redirect('/completar-perfil')

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <IsidoroLogo height={40} />
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {profile.full_name.split(' ')[0]}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="p-1.5 rounded-md transition-colors hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Cerrar sesión"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-lg mx-auto">{children}</main>
    </div>
  )
}
