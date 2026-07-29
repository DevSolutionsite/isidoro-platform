'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

  const { error } = await supabase.from('categories').insert({ name, sort_order })
  if (error) throw new Error(error.message)

  redirect('/admin/categorias?success=created')
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0

  const { error } = await supabase.from('categories').update({ name, sort_order }).eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/categorias?success=updated')
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/categorias?success=deleted')
}
