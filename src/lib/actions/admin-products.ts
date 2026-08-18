'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProductActionState {
  error?: string
}

function buildListRedirect(formData: FormData, success: string): string {
  const returnQ = (formData.get('returnQ') as string) || ''
  const returnCategoria = (formData.get('returnCategoria') as string) || ''
  const params = new URLSearchParams()
  if (returnQ) params.set('q', returnQ)
  if (returnCategoria) params.set('categoria', returnCategoria)
  params.set('success', success)
  return `/admin/productos?${params.toString()}`
}

const PRODUCT_IMAGES_BUCKET = 'product-images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

// URLs públicas del bucket tienen forma:
// https://<project>.supabase.co/storage/v1/object/public/product-images/<path>
function extractStoragePath(imageUrl: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return imageUrl.slice(idx + marker.length)
}

async function uploadProductImage(
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
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type })

  if (error) {
    return { error: `No se pudo subir la imagen: ${error.message}` }
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

async function deleteProductImage(supabase: SupabaseClient, imageUrl: string): Promise<void> {
  const path = extractStoragePath(imageUrl)
  if (!path) return
  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path])
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const description = (formData.get('description') as string) || null
  const price = parseFloat(formData.get('price') as string)
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0
  const is_available = formData.get('is_available') === 'on'

  const imageFile = formData.get('image_file') as File | null
  let image_url = (formData.get('current_image_url') as string) || null

  if (imageFile && imageFile.size > 0) {
    const result = await uploadProductImage(supabase, imageFile)
    if ('error' in result) return { error: result.error }
    image_url = result.url
  }

  const { error } = await supabase.from('products').insert({
    name, category_id, description, price, sort_order, image_url, is_available,
  })
  if (error) return { error: error.message }

  redirect(buildListRedirect(formData, 'created'))
}

export async function updateProduct(
  id: string,
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const supabase = await createClient()
  await requireAdmin(supabase)
  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const description = (formData.get('description') as string) || null
  const price = parseFloat(formData.get('price') as string)
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0
  const is_available = formData.get('is_available') === 'on'

  const imageFile = formData.get('image_file') as File | null
  const previousImageUrl = (formData.get('current_image_url') as string) || null
  let image_url = previousImageUrl

  if (imageFile && imageFile.size > 0) {
    const result = await uploadProductImage(supabase, imageFile)
    if ('error' in result) return { error: result.error }
    image_url = result.url

    if (previousImageUrl) {
      await deleteProductImage(supabase, previousImageUrl)
    }
  }

  const { error } = await supabase
    .from('products')
    .update({ name, category_id, description, price, sort_order, image_url, is_available })
    .eq('id', id)
  if (error) return { error: error.message }

  redirect(buildListRedirect(formData, 'updated'))
}

export async function deleteProduct(id: string): Promise<{ ok: true } | { ok: false; code: string }> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  return { ok: true }
}
