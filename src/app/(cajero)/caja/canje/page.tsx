import type { Metadata } from 'next'
import { ConfirmarCanjeForm } from '@/components/cajero/ConfirmarCanjeForm'
import { CajaTabs } from '@/components/cajero/CajaTabs'

export const metadata: Metadata = { title: 'Confirmar Canje — Isidoro' }

export default function CanjePage() {
  return (
    <div className="space-y-6">
      <CajaTabs active="canje" />

      <div className="space-y-4">
        <h1
          className="text-xl font-semibold font-display"
          style={{ color: 'var(--foreground)' }}
        >
          Confirmar canje
        </h1>
        <ConfirmarCanjeForm />
      </div>
    </div>
  )
}
