import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompletarPerfilForm } from '@/components/auth/CompletarPerfilForm'

export const metadata: Metadata = {
  title: 'Completá tu perfil — Isidoro',
}

const ROLE_ROUTES: Record<string, string> = {
  cajero: '/caja',
  admin: '/admin',
}

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function CompletarPerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, dni, phone, city')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'cliente') redirect(ROLE_ROUTES[profile.role] ?? '/login')
  if (profile.dni && profile.phone && profile.city) redirect('/perfil')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface px-4 py-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Isidoro</h1>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="mb-2 text-xl font-semibold text-foreground">Completá tu perfil</h2>
          <p className="mb-6 text-sm text-text-muted">
            Necesitamos estos datos para identificarte en el restaurante y que puedas empezar a
            sumar puntos.
          </p>

          <CompletarPerfilForm
            userId={user.id}
            initialDni={profile.dni ?? ''}
            initialPhone={profile.phone ?? ''}
            initialCity={profile.city ?? ''}
          />

          <form action={logout} className="mt-6 text-center">
            <button
              type="submit"
              className="text-sm font-medium text-text-muted hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
