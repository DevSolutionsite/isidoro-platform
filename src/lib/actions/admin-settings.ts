'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateMaxConsumptionAmount(formData: FormData) {
  const supabase = await createClient()
  const raw = formData.get('max_consumption_amount') as string
  const value = parseFloat(raw)

  if (isNaN(value) || value <= 0) {
    redirect('/admin/inicio?error=invalid_max_consumption_amount')
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
  redirect('/admin/inicio?success=updated')
}
