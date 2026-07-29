'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoogleAuthButton } from './GoogleAuthButton'
import { CityCombobox } from './CityCombobox'
import { CIUDADES_SANTA_FE } from '@/lib/data/ciudades'

const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand transition-colors'

const DNI_REGEX = /^\d{7,8}$/

function mapAuthError(message: string): string {
  if (message.includes('User already registered')) return 'Ya existe una cuenta con ese email'
  if (message.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres'
  return 'Ocurrió un error. Intentá de nuevo.'
}

export function RegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [dni, setDni] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!DNI_REGEX.test(dni.trim())) {
      setError('El DNI debe tener 7 u 8 dígitos, sin puntos')
      return
    }

    if (!phone.trim()) {
      setError('Ingresá un teléfono de contacto')
      return
    }

    if (!city.trim()) {
      setError('Ingresá tu ciudad')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          dni: dni.trim(),
          phone: phone.trim(),
          city: city.trim(),
        },
      },
    })

    if (authError) {
      setError(mapAuthError(authError.message))
      setLoading(false)
      return
    }

    if (data.session) {
      router.replace('/perfil')
    } else {
      setEmailSent(true)
    }
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border bg-surface px-4 py-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Isidoro</h1>
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
              Te enviamos un link de confirmación a{' '}
              <strong className="text-foreground">{email}</strong>. Hacé click en el link para
              activar tu cuenta.
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Isidoro</h1>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Crear cuenta</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan García"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dni" className="text-sm font-medium text-foreground">
                DNI
              </label>
              <input
                id="dni"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                required
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="30123456"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 342 1234567"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className="text-sm font-medium text-foreground">
                Ciudad
              </label>
              <CityCombobox
                id="city"
                value={city}
                onChange={setCity}
                options={CIUDADES_SANTA_FE}
                required
                placeholder="Santa Fe"
              />
            </div>

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
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Repetir contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLS}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-text-muted">o</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <GoogleAuthButton label="Registrarse con Google" />

          <p className="mt-6 text-center text-sm text-text-muted">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
