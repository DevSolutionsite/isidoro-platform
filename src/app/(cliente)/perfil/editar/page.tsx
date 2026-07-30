import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EditarPerfilForm } from '@/components/perfil/EditarPerfilForm'

export const metadata: Metadata = {
  title: 'Editar perfil — Isidoro',
}

export default async function EditarPerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, dni, phone, city')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="px-4 pb-10 pt-6">
      <Link
        href="/perfil"
        className="mb-4 inline-block text-sm font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Volver a mi perfil
      </Link>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight font-display">
        Editar mis datos
      </h1>

      <EditarPerfilForm
        userId={user.id}
        initialFullName={profile.full_name}
        dni={profile.dni ?? ''}
        initialPhone={profile.phone ?? ''}
        initialCity={profile.city ?? ''}
      />
    </div>
  )
}
