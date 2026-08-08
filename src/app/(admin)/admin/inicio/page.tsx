import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SuccessBanner } from '@/components/admin/SuccessBanner'
import { HeroImageThumb } from '@/components/admin/HeroImageThumb'
import { AddHeroImageForm } from '@/components/admin/AddHeroImageForm'
import { addHeroImage, removeHeroImage, moveHeroImage, updateHours } from '@/lib/actions/admin-site-content'
import { updateMaxConsumptionAmount, updatePointsPerPeso } from '@/lib/actions/admin-settings'

export const metadata: Metadata = { title: 'Inicio — Admin Isidoro' }

const ERROR_MESSAGES: Record<string, string> = {
  missing_file: 'Seleccioná una imagen para agregar.',
  invalid_max_consumption_amount: 'Ingresá un monto máximo válido, mayor a 0.',
  invalid_points_per_peso: 'Ingresá una equivalencia de puntos por peso válida, mayor a 0.',
}

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams

  const supabase = await createClient()
  const [{ data: siteContent }, { data: settings }] = await Promise.all([
    supabase.from('site_content').select('hero_images, hours_text').single(),
    supabase.from('settings').select('max_consumption_amount, points_per_peso').single(),
  ])

  const heroImages: string[] = siteContent?.hero_images ?? []
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? decodeURIComponent(error)) : null

  return (
    <div>
      <SuccessBanner type={success} />
      {errorMessage && (
        <div
          className="px-6 py-3 text-sm font-medium"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderBottom: '1px solid rgba(220,38,38,0.3)' }}
        >
          {errorMessage}
        </div>
      )}

      <div className="px-8 py-6 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
            Inicio
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Imágenes del hero y horarios de atención mostrados en la landing.
          </p>
        </div>

        {/* Imágenes del hero */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Imágenes del hero
          </h2>

          {heroImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 md:grid-cols-4">
              {heroImages.map((url, i) => (
                <HeroImageThumb
                  key={url}
                  src={url}
                  onMoveUp={i > 0 ? moveHeroImage.bind(null, i, 'up') : undefined}
                  onMoveDown={i < heroImages.length - 1 ? moveHeroImage.bind(null, i, 'down') : undefined}
                  onRemove={removeHeroImage.bind(null, url)}
                />
              ))}
            </div>
          )}

          <AddHeroImageForm action={addHeroImage} />
        </section>

        {/* Horarios de atención */}
        <section className="max-w-lg">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Horarios de atención
          </h2>
          <form action={updateHours} className="space-y-3">
            <textarea
              name="hours_text"
              rows={4}
              defaultValue={siteContent?.hours_text ?? ''}
              placeholder={'Ej: Martes a domingo de 12 a 16hs y de 20 a 00hs.\nLunes cerrado.'}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)', resize: 'vertical' }}
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--brand)', color: 'var(--background)' }}
            >
              Guardar
            </button>
          </form>
        </section>

        {/* Puntos por peso */}
        <section className="max-w-lg">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Puntos acreditados por peso gastado
          </h2>
          <form action={updatePointsPerPeso} className="space-y-3">
            <input
              id="points_per_peso"
              name="points_per_peso"
              type="number"
              step="0.0001"
              min="0.0001"
              required
              defaultValue={settings?.points_per_peso ?? ''}
              placeholder="Ej: 0.1"
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold tabular-nums outline-none transition-colors"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Puntos que gana el cliente por cada peso consumido. Ej: 0.1 = 10% del monto
              en puntos (una compra de $1000 acredita 100 puntos). Se aplica a partir del
              próximo consumo registrado — no afecta puntos ya acreditados.
            </p>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--brand)', color: 'var(--background)' }}
            >
              Guardar
            </button>
          </form>
        </section>

        {/* Tope máximo de consumo */}
        <section className="max-w-lg">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Tope máximo por consumo
          </h2>
          <form action={updateMaxConsumptionAmount} className="space-y-3">
            <input
              id="max_consumption_amount"
              name="max_consumption_amount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              defaultValue={settings?.max_consumption_amount ?? ''}
              placeholder="Ej: 1000000"
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold tabular-nums outline-none transition-colors"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Monto máximo permitido por operación. Las cargas que superen este valor serán
              rechazadas automáticamente para prevenir errores de tipeo o cargas fraudulentas.
            </p>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--brand)', color: 'var(--background)' }}
            >
              Guardar
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
