'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CityCombobox } from '@/components/auth/CityCombobox'
import { CIUDADES_SANTA_FE } from '@/lib/data/ciudades'
import { PHONE_REGEX, normalizePhone } from '@/lib/validation'

const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand transition-colors'

const DISABLED_INPUT_CLS =
  'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-muted cursor-not-allowed'

type EditarPerfilFormProps = {
  userId: string
  initialFullName: string
  dni: string
  initialPhone: string
  initialCity: string
}

export function EditarPerfilForm({
  userId,
  initialFullName,
  dni,
  initialPhone,
  initialCity,
}: EditarPerfilFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [phone, setPhone] = useState(initialPhone)
  const [city, setCity] = useState(initialCity)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Ingresá tu nombre completo')
      return
    }

    const normalizedPhone = normalizePhone(phone)
    if (!PHONE_REGEX.test(normalizedPhone)) {
      setError('El teléfono debe tener 10 dígitos')
      return
    }

    if (!city.trim()) {
      setError('Ingresá tu ciudad')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: normalizedPhone, city: city.trim() })
      .eq('id', userId)

    if (updateError) {
      setError('Ocurrió un error. Intentá de nuevo.')
      setLoading(false)
      return
    }

    router.replace('/perfil')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
          disabled
          value={dni}
          className={DISABLED_INPUT_CLS}
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          El DNI no se puede editar una vez cargado
        </span>
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

      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}
