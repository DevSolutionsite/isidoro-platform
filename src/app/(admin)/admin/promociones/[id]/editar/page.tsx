import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PromoForm } from '@/components/admin/PromoForm'
import { updatePromotion } from '@/lib/actions/admin-promotions'

export const metadata: Metadata = { title: 'Editar promoción — Admin Isidoro' }

export default async function EditarPromocionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: promo } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .single()

  if (!promo) notFound()

  return (
    <div className="px-8 py-6">
      <Link
        href="/admin/promociones"
        className="text-xs mb-4 inline-block transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ← Volver a promociones
      </Link>
      <h1 className="text-2xl font-semibold font-display mb-1" style={{ color: 'var(--foreground)' }}>
        Editar promoción
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{promo.name}</p>
      <PromoForm promo={promo} action={updatePromotion.bind(null, id)} mode="edit" />
    </div>
  )
}
