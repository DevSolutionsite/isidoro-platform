import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Crear cuenta — Isidoro',
}

const ROLE_ROUTES: Record<string, string> = {
  cliente: '/perfil',
  cajero: '/caja',
  admin: '/admin',
}

export default async function RegisterPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    redirect(ROLE_ROUTES[profile?.role ?? ''] ?? '/perfil')
  }

  return <RegisterForm />
}
