import type { Metadata } from 'next'
import Link from 'next/link'
import { PromoForm } from '@/components/admin/PromoForm'
import { createPromotion } from '@/lib/actions/admin-promotions'

export const metadata: Metadata = { title: 'Nueva promoción — Admin Isidoro' }

export default function NuevaPromocionPage() {
  return (
    <div className="px-8 py-6">
      <Link
        href="/admin/promociones"
        className="text-xs mb-4 inline-block transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Volver a promociones
      </Link>
      <h1 className="text-2xl font-semibold font-display mb-6" style={{ color: 'var(--foreground)' }}>
        Nueva promoción
      </h1>
      <PromoForm action={createPromotion} mode="create" />
    </div>
  )
}
