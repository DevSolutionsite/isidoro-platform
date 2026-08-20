'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { uploadAdminImage, deleteAdminImage } from '@/lib/storage/adminImageUpload'

const PROMOTION_IMAGES_BUCKET = 'promotion-images'

export async function createPromotion(formData: FormData) {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valid_from = new Date(formData.get('valid_from') as string).toISOString()
  const valid_until = new Date(formData.get('valid_until') as string).toISOString()
  const is_active = formData.get('is_active') === 'on'

  const imageFile = formData.get('image_file') as File | null
  let image_url = (formData.get('current_image_url') as string) || null

  if (imageFile && imageFile.size > 0) {
    const result = await uploadAdminImage(supabase, PROMOTION_IMAGES_BUCKET, imageFile)
    if ('error' in result) throw new Error(result.error)
    image_url = result.url
  }

  const { error } = await supabase
    .from('promotions')
    .insert({ name, description, valid_from, valid_until, is_active, image_url })
  if (error) throw new Error(error.message)

  redirect('/admin/promociones?success=created')
}

export async function updatePromotion(id: string, formData: FormData) {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const valid_from = new Date(formData.get('valid_from') as string).toISOString()
  const valid_until = new Date(formData.get('valid_until') as string).toISOString()
  const is_active = formData.get('is_active') === 'on'

  const imageFile = formData.get('image_file') as File | null
  const previousImageUrl = (formData.get('current_image_url') as string) || null
  let image_url = previousImageUrl

  if (imageFile && imageFile.size > 0) {
    const result = await uploadAdminImage(supabase, PROMOTION_IMAGES_BUCKET, imageFile)
    if ('error' in result) throw new Error(result.error)
    image_url = result.url

    if (previousImageUrl) {
      await deleteAdminImage(supabase, PROMOTION_IMAGES_BUCKET, previousImageUrl)
    }
  }

  const { error } = await supabase
    .from('promotions')
    .update({ name, description, valid_from, valid_until, is_active, image_url })
    .eq('id', id)
  if (error) throw new Error(error.message)

  redirect('/admin/promociones?success=updated')
}

export async function deletePromotion(id: string): Promise<{ ok: true } | { ok: false; code: string }> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('promotions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  return { ok: true }
}
