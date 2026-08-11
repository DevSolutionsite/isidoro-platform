'use server'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SettingsActionResult = { ok: true } | { ok: false; code: string }

export async function updatePointsPerPeso(formData: FormData): Promise<SettingsActionResult> {
  const supabase = await createClient()
  const raw = formData.get('points_per_peso') as string
  const value = parseFloat(raw)

  if (isNaN(value) || value <= 0) {
    return { ok: false, code: 'invalid_points_per_peso' }
  }

  const { data: row, error: fetchError } = await supabase
    .from('settings')
    .select('id')
    .single()
  if (fetchError || !row) throw new Error(fetchError?.message ?? 'No se encontró settings.')

  const { error } = await supabase
    .from('settings')
    .update({ points_per_peso: value })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('settings')
  return { ok: true }
}

export async function updateMaxConsumptionAmount(
  formData: FormData
): Promise<SettingsActionResult> {
  const supabase = await createClient()
  const raw = formData.get('max_consumption_amount') as string
  const value = parseFloat(raw)

  if (isNaN(value) || value <= 0) {
    return { ok: false, code: 'invalid_max_consumption_amount' }
  }

  const { data: row, error: fetchError } = await supabase
    .from('settings')
    .select('id')
    .single()
  if (fetchError || !row) throw new Error(fetchError?.message ?? 'No se encontró settings.')

  const { error } = await supabase
    .from('settings')
    .update({ max_consumption_amount: value })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('settings')
  return { ok: true }
}
