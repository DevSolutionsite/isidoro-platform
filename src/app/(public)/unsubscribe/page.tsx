import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { IsidoroLogo } from '@/components/IsidoroLogo'

export const metadata: Metadata = { title: 'Darse de baja — Isidoro' }

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let success = false
  if (token) {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .update({ email_opt_out: true })
      .eq('unsubscribe_token', token)
      .select('id')
    success = !error && (data?.length ?? 0) > 0
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--background)' }}
    >
      <IsidoroLogo height={56} />
      <div className="mt-8 max-w-sm">
        {success ? (
          <>
            <h1 className="text-xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
              Listo, te diste de baja
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              No vas a recibir más mails promocionales de Isidoro. Tu cuenta y tus puntos siguen
              intactos.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
              Link inválido
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Este link de baja no es válido o ya expiró.
            </p>
          </>
        )}
        <Link
          href="/carta"
          className="inline-block mt-6 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--brand)' }}
        >
          Volver a la carta
        </Link>
      </div>
    </main>
  )
}
