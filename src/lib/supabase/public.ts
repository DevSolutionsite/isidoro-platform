import { createClient } from '@supabase/supabase-js'

// Cliente anon sin cookies() — seguro para usar dentro de scopes de cache
// (unstable_cache no soporta cookies()/headers() dentro). Solo para datos
// que no dependen de la sesión del usuario (ej: settings públicos).
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
