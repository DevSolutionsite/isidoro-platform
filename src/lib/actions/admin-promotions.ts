'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createPromotion(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valid_from = new Date(formData.get('valid_from') as string).toISOString()
  const valid_until = new Date(formData.get('valid_until') as string).toISOString()
  const is_active = formData.get('is_active') === 'on'

  const { error } = await supabase
    .from('promotions')
    .insert({ name, description, valid_from, valid_until, is_active })
  if (error) throw new Error(error.message)

  redirect('/admin/promociones?success=created')
}

export async function updatePromotion(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valid_from = new Date(formData.get('valid_from') as string).toISOString()
  const valid_until = new Date(formData.get('valid_until') as string).toISOString()
  const is_active = formData.get('is_active') === 'on'

  const { error } = await supabase
    .from('promotions')
    .update({ name, description, valid_from, valid_until, is_active })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/promociones?success=updated')
}

export async function deletePromotion(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('promotions')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/promociones?success=deleted')
}
