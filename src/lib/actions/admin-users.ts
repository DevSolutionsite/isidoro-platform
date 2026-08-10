'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = ['cliente', 'cajero', 'admin'] as const
type Role = (typeof VALID_ROLES)[number]

export async function updateUserRole(userId: string, formData: FormData) {
  const supabase = await createClient()
  const role = formData.get('role') as string

  if (!VALID_ROLES.includes(role as Role)) {
    redirect('/admin/usuarios?error=invalid_role')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  if (user.id === userId) {
    redirect('/admin/usuarios?error=cannot_edit_self')
  }

  // Server Actions son endpoints propios, invocables sin pasar por la página
  // que los renderiza — el gate de (admin)/layout.tsx no alcanza. Se
  // verifica el rol acá explícitamente en vez de confiar solo en que la
  // RLS bloquee la escritura, porque un update sin filas afectadas por RLS
  // no siempre vuelve como `error`, y mostraría "Actualizado correctamente"
  // sin haber cambiado nada.
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') redirect('/login')

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: role as Role })
    .eq('id', userId)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error('No se encontró el usuario a actualizar.')
  }

  redirect('/admin/usuarios?success=updated')
}
