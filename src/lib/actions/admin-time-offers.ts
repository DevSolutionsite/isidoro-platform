'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createTimeOffer(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const start_time = (formData.get('start_time') as string) + ':00'
  const end_time = (formData.get('end_time') as string) + ':00'
  const is_active = formData.get('is_active') === 'on'

  const { data, error } = await supabase
    .from('time_offers')
    .insert({ name, description, start_time, end_time, is_active })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const product_ids = formData.getAll('product_ids') as string[]
  const price_overrides = formData.getAll('price_overrides') as string[]

  if (product_ids.length > 0) {
    const associations = product_ids.map((product_id, i) => ({
      time_offer_id: data.id,
      product_id,
      price_override: price_overrides[i] !== '' ? parseFloat(price_overrides[i]) : null,
    }))
    const { error: assocError } = await supabase.from('time_offer_products').insert(associations)
    if (assocError) throw new Error(assocError.message)
  }

  redirect('/admin/ofertas?success=created')
}

export async function updateTimeOffer(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const start_time = (formData.get('start_time') as string) + ':00'
  const end_time = (formData.get('end_time') as string) + ':00'
  const is_active = formData.get('is_active') === 'on'

  const { error } = await supabase
    .from('time_offers')
    .update({ name, description, start_time, end_time, is_active })
    .eq('id', id)
  if (error) throw new Error(error.message)

  const { error: delError } = await supabase
    .from('time_offer_products')
    .delete()
    .eq('time_offer_id', id)
  if (delError) throw new Error(delError.message)

  const product_ids = formData.getAll('product_ids') as string[]
  const price_overrides = formData.getAll('price_overrides') as string[]

  if (product_ids.length > 0) {
    const associations = product_ids.map((product_id, i) => ({
      time_offer_id: id,
      product_id,
      price_override: price_overrides[i] !== '' ? parseFloat(price_overrides[i]) : null,
    }))
    const { error: assocError } = await supabase.from('time_offer_products').insert(associations)
    if (assocError) throw new Error(assocError.message)
  }

  redirect('/admin/ofertas?success=updated')
}

export async function deleteTimeOffer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('time_offers')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/ofertas?success=deleted')
}
