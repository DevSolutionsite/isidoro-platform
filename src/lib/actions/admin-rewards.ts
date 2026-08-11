'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface RewardActionState {
  error?: string
}

const VALIDATION_MESSAGES: Record<string, string> = {
  invalid_points_cost: 'Ingresá un costo en puntos válido, mayor a 0.',
  invalid_stock: 'Ingresá un stock válido (0 o más), o dejalo vacío para sin límite.',
}

export async function createReward(
  _prevState: RewardActionState,
  formData: FormData
): Promise<RewardActionState> {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const points_cost = parseInt(formData.get('points_cost') as string, 10)
  const stockRaw = formData.get('stock') as string
  const stock = stockRaw === '' ? null : parseInt(stockRaw, 10)
  const is_active = formData.get('is_active') === 'on'

  if (isNaN(points_cost) || points_cost <= 0) {
    return { error: VALIDATION_MESSAGES.invalid_points_cost }
  }
  if (stock !== null && (isNaN(stock) || stock < 0)) {
    return { error: VALIDATION_MESSAGES.invalid_stock }
  }

  const { error } = await supabase
    .from('rewards')
    .insert({ name, description, points_cost, stock, is_active })
  if (error) throw new Error(error.message)

  redirect('/admin/recompensas?success=created')
}

export async function updateReward(
  id: string,
  _prevState: RewardActionState,
  formData: FormData
): Promise<RewardActionState> {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const points_cost = parseInt(formData.get('points_cost') as string, 10)
  const stockRaw = formData.get('stock') as string
  const stock = stockRaw === '' ? null : parseInt(stockRaw, 10)
  const is_active = formData.get('is_active') === 'on'

  if (isNaN(points_cost) || points_cost <= 0) {
    return { error: VALIDATION_MESSAGES.invalid_points_cost }
  }
  if (stock !== null && (isNaN(stock) || stock < 0)) {
    return { error: VALIDATION_MESSAGES.invalid_stock }
  }

  const { error } = await supabase
    .from('rewards')
    .update({ name, description, points_cost, stock, is_active })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/recompensas?success=updated')
}

export async function deleteReward(id: string): Promise<{ ok: true } | { ok: false; code: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('rewards')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)

  return { ok: true }
}
