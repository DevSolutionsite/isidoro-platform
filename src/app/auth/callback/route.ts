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
  let redirectType: string | null = null

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    redirectType = (data as { redirectType?: string | null }).redirectType ?? null

    if (!error) {
      if (redirectType === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }

      const { user } = data
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const dest = ROLE_ROUTES[profile?.role ?? ''] ?? '/perfil'
        return NextResponse.redirect(new URL(dest, request.url))
      }
    }
  }

  const errorParam = redirectType === 'recovery' ? 'recovery' : 'oauth'
  return NextResponse.redirect(new URL(`/login?error=${errorParam}`, request.url))
}
