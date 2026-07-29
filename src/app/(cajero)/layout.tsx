import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IsidoroLogo } from '@/components/IsidoroLogo'

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function CajeroLayout({
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

  // Allow admin access for testing; production: cajero only
  if (!profile || (profile.role !== 'cajero' && profile.role !== 'admin')) {
    redirect('/login')
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      <header
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <IsidoroLogo height={38} />
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile.full_name.split(' ')[0]} ·{' '}
            <span style={{ color: 'var(--brand)' }}>Caja</span>
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
