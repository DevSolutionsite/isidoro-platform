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

  if (user?.id === userId) {
    redirect('/admin/usuarios?error=cannot_edit_self')
  }

  const { error } = await supabase.from('profiles').update({ role: role as Role }).eq('id', userId)
  if (error) throw new Error(error.message)

  redirect('/admin/usuarios?success=updated')
}
