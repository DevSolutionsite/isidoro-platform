import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { EmailForm } from '@/components/admin/EmailForm'
import { sendPromotionalEmail } from '@/lib/actions/admin-email'

export const metadata: Metadata = { title: 'Email — Admin Isidoro' }

export default async function AdminEmailPage() {
  const supabase = await createClient()
  const { data: eligibleClients } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('role', 'cliente')
    .eq('marketing_consent', true)
    .eq('email_opt_out', false)
    .order('full_name')

  const eligibleNames = (eligibleClients ?? []).map((c) => c.full_name)

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--foreground)' }}>
        Email promocional
      </h1>
      <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
        Se envía a los clientes que aceptaron recibir promociones.
      </p>

      <div className="mt-6">
        <EmailForm action={sendPromotionalEmail} eligibleCount={eligibleNames.length} eligibleNames={eligibleNames} />
      </div>
    </div>
  )
}
