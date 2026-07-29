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

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
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
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', request.url))
}
