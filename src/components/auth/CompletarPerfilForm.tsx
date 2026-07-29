'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CityCombobox } from './CityCombobox'
import { CIUDADES_SANTA_FE } from '@/lib/data/ciudades'

const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand transition-colors'

const DNI_REGEX = /^\d{7,8}$/

type CompletarPerfilFormProps = {
  userId: string
  initialDni: string
  initialPhone: string
  initialCity: string
}

export function CompletarPerfilForm({
  userId,
  initialDni,
  initialPhone,
  initialCity,
}: CompletarPerfilFormProps) {
  const router = useRouter()
  const [dni, setDni] = useState(initialDni)
  const [phone, setPhone] = useState(initialPhone)
  const [city, setCity] = useState(initialCity)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ dni: dni.trim(), phone: phone.trim(), city: city.trim() })
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

      <button
        type="submit"
        disabled={loading}
        className="mt-1 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Guardar y continuar'}
      </button>
    </form>
  )
}
