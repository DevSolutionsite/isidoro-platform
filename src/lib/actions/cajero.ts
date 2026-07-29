'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SplitConsumptionResponse } from '@/lib/types'

export async function registrarConsumo(clientId: string, formData: FormData) {
  const supabase = await createClient()
  const amount = parseFloat(formData.get('amount') as string)
  const notes = (formData.get('notes') as string) || undefined

  const { data, error } = await supabase.functions.invoke('register-consumption', {
    body: { client_id: clientId, amount, notes },
  })

  if (error) throw new Error(error.message)

  redirect(`/caja?done=${clientId}&pts=${data.points_earned}`)
}

export async function confirmarCanje(formData: FormData) {
  const supabase = await createClient()
  const digits = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5']
    .map((k) => (formData.get(k) as string | null) ?? '')
  const code = digits.join('').trim()

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
    redirect(`/caja/canje?error=${encodeURIComponent(errorCode)}`)
  }

  redirect(
    `/caja/canje?done=1&reward=${encodeURIComponent(data.reward_name)}&pts=${data.points_used}&balance=${data.client_new_balance}`
  )
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
  totalAmount?: number,
): Promise<DividirCuentaResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke('split-consumption', {
    body: { splits, total_amount: totalAmount },
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
