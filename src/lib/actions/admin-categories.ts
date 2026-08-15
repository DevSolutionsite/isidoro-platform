'use server'

import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0
  const parent_category_id = (formData.get('parent_category_id') as string) || null

  const { error } = await supabase.from('categories').insert({ name, sort_order, parent_category_id })
  if (error) throw new Error(error.message)

  revalidateTag('categories', { expire: 0 })
  redirect('/admin/categorias?success=created')
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0
  const parent_category_id = (formData.get('parent_category_id') as string) || null

  const { error } = await supabase
    .from('categories')
    .update({ name, sort_order, parent_category_id })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidateTag('categories', { expire: 0 })
  redirect('/admin/categorias?success=updated')
}

export async function deleteCategory(id: string): Promise<{ ok: true } | { ok: false; code: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidateTag('categories', { expire: 0 })
  return { ok: true }
}

export async function toggleCategoryActive(
  id: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .update({ is_active: active })
    .eq('id', id)
  if (error) return { ok: false, code: error.message }

  revalidateTag('categories', { expire: 0 })
  return { ok: true }
}
