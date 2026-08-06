'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const HERO_IMAGES_BUCKET = 'hero-images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

// URLs públicas del bucket tienen forma:
// https://<project>.supabase.co/storage/v1/object/public/hero-images/<path>
function extractStoragePath(imageUrl: string): string | null {
  const marker = `/storage/v1/object/public/${HERO_IMAGES_BUCKET}/`
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return imageUrl.slice(idx + marker.length)
}

async function uploadHeroImage(
  supabase: SupabaseClient,
  file: File
): Promise<{ url: string } | { error: string }> {
  const ext = ALLOWED_IMAGE_TYPES[file.type]
  if (!ext) {
    return { error: 'Formato no soportado. Usá PNG, JPEG o WebP.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'La imagen supera el límite de 5MB.' }
  }

  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(HERO_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type })

  if (error) {
    return { error: `No se pudo subir la imagen: ${error.message}` }
  }

  const { data } = supabase.storage.from(HERO_IMAGES_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

async function getSiteContentRow(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('site_content')
    .select('id, hero_images')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'No se encontró site_content.')
  return data as { id: string; hero_images: string[] }
}

export async function addHeroImage(formData: FormData) {
  const supabase = await createClient()
  const imageFile = formData.get('image_file') as File | null
  if (!imageFile || imageFile.size === 0) {
    redirect('/admin/inicio?error=missing_file')
  }

  const result = await uploadHeroImage(supabase, imageFile)
  if ('error' in result) {
    redirect(`/admin/inicio?error=${encodeURIComponent(result.error)}`)
  }

  const row = await getSiteContentRow(supabase)
  const hero_images = [...row.hero_images, result.url]

  const { error } = await supabase
    .from('site_content')
    .update({ hero_images })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('site-content')
  redirect('/admin/inicio?success=added')
}

export async function removeHeroImage(url: string) {
  const supabase = await createClient()
  const row = await getSiteContentRow(supabase)
  const hero_images = row.hero_images.filter((img) => img !== url)

  const { error } = await supabase
    .from('site_content')
    .update({ hero_images })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  const path = extractStoragePath(url)
  if (path) {
    await supabase.storage.from(HERO_IMAGES_BUCKET).remove([path])
  }

  updateTag('site-content')
  redirect('/admin/inicio?success=removed')
}

export async function moveHeroImage(index: number, direction: 'up' | 'down') {
  const supabase = await createClient()
  const row = await getSiteContentRow(supabase)
  const hero_images = [...row.hero_images]

  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= hero_images.length) {
    redirect('/admin/inicio')
  }

  const [moved] = hero_images.splice(index, 1)
  hero_images.splice(target, 0, moved)

  const { error } = await supabase
    .from('site_content')
    .update({ hero_images })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('site-content')
  redirect('/admin/inicio')
}

export async function updateHours(formData: FormData) {
  const supabase = await createClient()
  const hours_text = (formData.get('hours_text') as string).trim() || null

  const row = await getSiteContentRow(supabase)
  const { error } = await supabase
    .from('site_content')
    .update({ hours_text })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('site-content')
  redirect('/admin/inicio?success=updated')
}
