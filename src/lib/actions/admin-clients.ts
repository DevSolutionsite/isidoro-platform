'use server'

import { createClient } from '@/lib/supabase/server'

export type AdjustPointsResult = { ok: true } | { ok: false; code: string }

export async function adjustPoints(clientId: string, formData: FormData): Promise<AdjustPointsResult> {
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
    return { ok: false, code: errorCode }
  }

  return { ok: true }
}
