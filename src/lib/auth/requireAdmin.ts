import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

// Server Actions son endpoints propios, invocables sin pasar por la página
// que los renderiza — el gate de (admin)/layout.tsx no alcanza. Se verifica
// el rol acá explícitamente en vez de confiar solo en la RLS, mismo criterio
// que updateUserRole (admin-users.ts) y el que ya usaban admin-delivery.ts /
// admin-email.ts antes de esta extracción a helper compartido.
export async function requireAdmin(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') redirect('/login')
}
