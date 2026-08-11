'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { InitiateRedemptionResponse } from '@/lib/types'

export type IniciarCanjeResult = { ok: false; code: string }

// El camino de éxito sigue haciendo redirect() a propósito: el código de 6
// dígitos tiene que sobrevivir un refresh de página (los puntos ya se
// descontaron server-side), y solo la URL garantiza eso hoy. El camino de
// error no tiene ese requisito — un error es transitorio, no hace falta
// pagar una navegación completa solo para mostrarlo.
export async function iniciarCanje(
  rewardId: string,
  rewardName: string,
): Promise<IniciarCanjeResult> {
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
    return { ok: false, code: errorCode }
  }

  redirect(
    `/perfil?code=${data!.code}&expires=${encodeURIComponent(data!.expires_at)}&reward=${encodeURIComponent(rewardName)}&redemption_id=${data!.redemption_id}`,
  )
}
