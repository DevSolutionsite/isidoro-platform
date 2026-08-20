import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

// URLs públicas de bucket tienen forma:
// https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
function extractStoragePath(bucket: string, imageUrl: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  return imageUrl.slice(idx + marker.length)
}

export async function uploadAdminImage(
  supabase: SupabaseClient,
  bucket: string,
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
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })

  if (error) {
    return { error: `No se pudo subir la imagen: ${error.message}` }
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function deleteAdminImage(
  supabase: SupabaseClient,
  bucket: string,
  imageUrl: string
): Promise<void> {
  const path = extractStoragePath(bucket, imageUrl)
  if (!path) return
  await supabase.storage.from(bucket).remove([path])
}
