import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DivisionCuentaForm } from '@/components/cajero/DivisionCuentaForm'
import { CajaTabs } from '@/components/cajero/CajaTabs'

export const metadata: Metadata = { title: 'División de cuenta — Isidoro' }

export default async function DivisionPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('points_per_peso')
    .single()

  const pointsPerPeso = settings?.points_per_peso ?? 1

  return (
    <div className="space-y-6">
      <CajaTabs active="division" />

      <div>
        <h1
          className="text-xl font-semibold font-display mb-1"
          style={{ color: 'var(--foreground)' }}
        >
          Dividir cuenta
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Agregá al menos 2 clientes y el monto que le corresponde a cada uno
        </p>
      </div>

      <DivisionCuentaForm pointsPerPeso={pointsPerPeso} />
    </div>
  )
}
