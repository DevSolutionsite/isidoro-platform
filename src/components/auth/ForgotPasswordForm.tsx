'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand transition-colors'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })

    setLoading(false)

    if (authError) {
      setError('Ocurrió un error. Intentá de nuevo.')
      return
    }

    // Siempre mostramos éxito, exista o no la cuenta, para no filtrar qué emails están registrados.
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-surface px-4 py-5 text-center">
          <Link href="/carta" className="text-2xl font-bold tracking-tight text-foreground">
            Isidoro
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
              <svg
                className="h-8 w-8 text-brand"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Revisá tu email</h2>
            <p className="text-sm text-text-muted">
              Si existe una cuenta con <strong className="text-foreground">{email}</strong>, te
              enviamos un link para restablecer tu contraseña.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-dark"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-surface px-4 py-5 text-center">
        <Link href="/carta" className="text-2xl font-bold tracking-tight text-foreground">
          Isidoro
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="mb-2 text-xl font-semibold text-foreground">Recuperar contraseña</h2>
          <p className="mb-6 text-sm text-text-muted">
            Ingresá tu email y te enviamos un link para restablecer tu contraseña.
          </p>

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

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
