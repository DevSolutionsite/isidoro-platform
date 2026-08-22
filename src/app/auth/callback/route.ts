import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ROLE_ROUTES: Record<string, string> = {
  cliente: '/perfil',
  cajero: '/caja',
  admin: '/admin',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  // TEMP DEBUG — remover una vez confirmada la causa raíz del bug de recovery
  console.log('[auth/callback] TEMP DEBUG full url:', request.url)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] TEMP DEBUG exchangeCodeForSession error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        type,
      })
    }

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const dest = ROLE_ROUTES[profile?.role ?? ''] ?? '/perfil'
        return NextResponse.redirect(new URL(dest, request.url))
      }

      console.error('[auth/callback] TEMP DEBUG exchange ok but no user. type:', type)
    }
  } else {
    console.error('[auth/callback] TEMP DEBUG no code param in url. type:', type)
  }

  const errorParam = type === 'recovery' ? 'recovery' : 'oauth'
  return NextResponse.redirect(new URL(`/login?error=${errorParam}`, request.url))
}
