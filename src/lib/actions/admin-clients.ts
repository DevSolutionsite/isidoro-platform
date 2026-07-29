'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function adjustPoints(clientId: string, formData: FormData) {
  const supabase = await createClient()
  const points = parseInt(formData.get('points') as string, 10)
  const notes = formData.get('note') as string

  const { error } = await supabase.functions.invoke('adjust-points', {
    body: { client_id: clientId, points, notes },
  })

  if (error) {
    let errorCode = 'unknown'
    if ('context' in error && error.context instanceof Response) {
      try {
        const body = await (error.context as Response).json()
        errorCode = body?.code ?? 'unknown'
      } catch { /* ignore */ }
    }
    redirect(`/admin/clientes/${clientId}?error=${encodeURIComponent(errorCode)}`)
  }

  redirect(`/admin/clientes/${clientId}?success=adjusted`)
}
