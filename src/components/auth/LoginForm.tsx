'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoogleAuthButton } from './GoogleAuthButton'

const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand transition-colors'

const ROLE_ROUTES: Record<string, string> = {
  cliente: '/perfil',
  cajero: '/caja',
  admin: '/admin',
}

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
  if (message.includes('Email not confirmed')) return 'Confirmá tu email antes de ingresar'
  return 'Ocurrió un error. Intentá de nuevo.'
}

interface LoginFormProps {
  oauthError?: boolean
}

export function LoginForm({ oauthError }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    oauthError ? 'Error al iniciar sesión con Google. Intentá de nuevo.' : null
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(mapAuthError(authError.message))
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    router.replace(ROLE_ROUTES[profile?.role ?? ''] ?? '/perfil')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface px-4 py-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Isidoro</h1>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLS}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-text-muted">o</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <GoogleAuthButton label="Continuar con Google" />

          <p className="mt-6 text-center text-sm text-text-muted">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="font-medium text-brand hover:text-brand-dark">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
