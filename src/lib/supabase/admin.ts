import { createClient } from '@supabase/supabase-js'

// Cliente con service role — bypassa RLS. Solo usar server-side, en paths
// que ya validaron autorización por su cuenta (admin action, o token
// verificado a mano como en /unsubscribe). Nunca importar desde código
// que corre en el cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
