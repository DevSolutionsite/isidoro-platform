'use server'

import { createClient } from '@/lib/supabase/server'
import type { ConfirmRedemptionResponse, SplitConsumptionResponse } from '@/lib/types'

export type RegistrarConsumoResult =
  | { ok: true; data: { points_earned: number } }
  | { ok: false; code: string }

export async function registrarConsumo(
  clientId: string,
  formData: FormData
): Promise<RegistrarConsumoResult> {
  const supabase = await createClient()
  const amount = parseFloat(formData.get('amount') as string)
  const notes = (formData.get('notes') as string) || undefined
  const idempotencyKey = formData.get('idempotency_key') as string

  const { data, error } = await supabase.functions.invoke('register-consumption', {
    body: { client_id: clientId, amount, notes, idempotency_key: idempotencyKey },
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

  return { ok: true, data: { points_earned: data.points_earned } }
}

export type ConfirmarCanjeResult =
  | { ok: true; data: ConfirmRedemptionResponse }
  | { ok: false; code: string }

export async function confirmarCanje(code: string): Promise<ConfirmarCanjeResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke('confirm-redemption', {
    body: { code },
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

  return { ok: true, data: data as ConfirmRedemptionResponse }
}

export type ClienteBusqueda = {
  id:           string
  full_name:    string
  phone:        string | null
  total_points: number
}

export async function buscarClienteParaDivision(
  query: string,
): Promise<ClienteBusqueda | null> {
  const supabase = await createClient()
  const trimmed = query.trim()
  if (!trimmed) return null

  const { data: byQR } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('qr_token', trimmed)
    .eq('role', 'cliente')
    .maybeSingle()

  let client = byQR
  if (!client) {
    const { data: byName } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('role', 'cliente')
      .ilike('full_name', `%${trimmed}%`)
      .limit(1)
      .maybeSingle()
    client = byName
  }

  if (!client) return null

  const { data: balance } = await supabase
    .from('points_balance')
    .select('total_points')
    .eq('client_id', client.id)
    .maybeSingle()

  return { ...client, total_points: balance?.total_points ?? 0 }
}

export type DividirCuentaResult =
  | { ok: true; data: SplitConsumptionResponse }
  | { ok: false; code: string }

export async function dividirCuenta(
  splits: { client_id: string; amount: number }[],
  totalAmount: number,
  idempotencyKey: string,
): Promise<DividirCuentaResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke('split-consumption', {
    body: { splits, total_amount: totalAmount, idempotency_key: idempotencyKey },
  })

  if (error) {
    let code = 'unknown'
    if ('context' in error && error.context instanceof Response) {
      try {
        const body = await (error.context as Response).json()
        code = body?.code ?? 'unknown'
      } catch { /* ignore */ }
    }
    return { ok: false, code }
  }

  return { ok: true, data: data as SplitConsumptionResponse }
}
