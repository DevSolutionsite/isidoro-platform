'use server'

import { updateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import type { SupabaseClient } from '@supabase/supabase-js'

const HERO_IMAGES_BUCKET = 'hero-images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type SiteContentActionResult = { ok: true } | { ok: false; code: string }
export type AddHeroImageResult = { ok: true; url: string } | { ok: false; code: string }

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

export async function addHeroImage(formData: FormData): Promise<AddHeroImageResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const imageFile = formData.get('image_file') as File | null
  if (!imageFile || imageFile.size === 0) {
    return { ok: false, code: 'missing_file' }
  }

  const result = await uploadHeroImage(supabase, imageFile)
  if ('error' in result) {
    return { ok: false, code: result.error }
  }

  const row = await getSiteContentRow(supabase)
  const hero_images = [...row.hero_images, result.url]

  const { error } = await supabase
    .from('site_content')
    .update({ hero_images })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('site-content')
  return { ok: true, url: result.url }
}

export async function removeHeroImage(url: string): Promise<SiteContentActionResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)
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
  return { ok: true }
}

export async function moveHeroImage(
  index: number,
  direction: 'up' | 'down'
): Promise<SiteContentActionResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const row = await getSiteContentRow(supabase)
  const hero_images = [...row.hero_images]

  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= hero_images.length) {
    return { ok: true }
  }

  const [moved] = hero_images.splice(index, 1)
  hero_images.splice(target, 0, moved)

  const { error } = await supabase
    .from('site_content')
    .update({ hero_images })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('site-content')
  return { ok: true }
}

export async function updateHours(formData: FormData): Promise<SiteContentActionResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const hours_text = (formData.get('hours_text') as string).trim() || null

  const row = await getSiteContentRow(supabase)
  const { error } = await supabase
    .from('site_content')
    .update({ hours_text })
    .eq('id', row.id)
  if (error) throw new Error(error.message)

  updateTag('site-content')
  return { ok: true }
}
