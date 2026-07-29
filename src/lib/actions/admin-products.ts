'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createProduct(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const description = (formData.get('description') as string) || null
  const price = parseFloat(formData.get('price') as string)
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0
  const image_url = (formData.get('image_url') as string) || null
  const is_available = formData.get('is_available') === 'on'

  const { error } = await supabase.from('products').insert({
    name, category_id, description, price, sort_order, image_url, is_available,
  })
  if (error) throw new Error(error.message)

  redirect('/admin/productos?success=created')
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const description = (formData.get('description') as string) || null
  const price = parseFloat(formData.get('price') as string)
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0
  const image_url = (formData.get('image_url') as string) || null
  const is_available = formData.get('is_available') === 'on'

  const { error } = await supabase
    .from('products')
    .update({ name, category_id, description, price, sort_order, image_url, is_available })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/productos?success=updated')
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/productos?success=deleted')
}
