import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { HeroImagesSection } from '@/components/admin/HeroImagesSection'
import { SettingForm } from '@/components/admin/SettingForm'
import { updateHours } from '@/lib/actions/admin-site-content'
import { updateMaxConsumptionAmount, updatePointsPerPeso } from '@/lib/actions/admin-settings'

export const metadata: Metadata = { title: 'Inicio — Admin Isidoro' }

export default async function InicioPage() {
  const supabase = await createClient()
  const [{ data: siteContent }, { data: settings }] = await Promise.all([
    supabase.from('site_content').select('hero_images, hours_text').single(),
    supabase.from('settings').select('max_consumption_amount, points_per_peso').single(),
  ])

  const heroImages: string[] = siteContent?.hero_images ?? []

  return (
    <div>
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
          <HeroImagesSection initialImages={heroImages} />
        </section>

        {/* Horarios de atención */}
        <section className="max-w-lg">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Horarios de atención
          </h2>
          <SettingForm action={updateHours}>
            <textarea
              name="hours_text"
              rows={4}
              defaultValue={siteContent?.hours_text ?? ''}
              placeholder={'Ej: Martes a domingo de 12 a 16hs y de 20 a 00hs.\nLunes cerrado.'}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)', resize: 'vertical' }}
            />
          </SettingForm>
        </section>

        {/* Puntos por peso */}
        <section className="max-w-lg">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Puntos acreditados por peso gastado
          </h2>
          <SettingForm
            action={updatePointsPerPeso}
            errorMessages={{
              invalid_points_per_peso: 'Ingresá una equivalencia de puntos por peso válida, mayor a 0.',
            }}
          >
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
          </SettingForm>
        </section>

        {/* Tope máximo de consumo */}
        <section className="max-w-lg">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
            Tope máximo por consumo
          </h2>
          <SettingForm
            action={updateMaxConsumptionAmount}
            errorMessages={{
              invalid_max_consumption_amount: 'Ingresá un monto máximo válido, mayor a 0.',
            }}
          >
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
          </SettingForm>
        </section>
      </div>
    </div>
  )
}
