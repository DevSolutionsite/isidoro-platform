'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { InitiateRedemptionResponse } from '@/lib/types'

export async function iniciarCanje(formData: FormData) {
  const rewardId   = formData.get('reward_id')   as string
  const rewardName = formData.get('reward_name')  as string

  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke<InitiateRedemptionResponse>(
    'initiate-redemption',
    { body: { reward_id: rewardId } },
  )

  if (error) {
    let errorCode = 'unknown'
    if ('context' in error && error.context instanceof Response) {
      try {
        const body = await (error.context as Response).json()
        errorCode = body?.code ?? 'unknown'
      } catch { /* ignore */ }
    }
    redirect(`/perfil?canje_error=${encodeURIComponent(errorCode)}`)
  }

  redirect(
    `/perfil?code=${data!.code}&expires=${encodeURIComponent(data!.expires_at)}&reward=${encodeURIComponent(rewardName)}`,
  )
}
