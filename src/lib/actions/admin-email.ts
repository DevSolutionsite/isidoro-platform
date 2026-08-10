'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildPromotionalEmailHtml } from '@/lib/email/promotionalTemplate'
import { getSiteUrl } from '@/lib/constants'

export interface EmailActionState {
  error?: string
  result?: { sent: number; failed: number; eligible: number }
}

const EMAIL_IMAGES_BUCKET = 'email-images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
const RESEND_FROM = 'Isidoro <onboarding@resend.dev>'
const BATCH_SIZE = 100
const BATCH_DELAY_MS = 600

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

// Todos los emails viven en auth.users, no en profiles — hace falta
// service role para leerlos (auth.admin.listUsers no es accesible con
// el cliente normal ni aunque el usuario sea admin de la app).
async function listAllUserEmails(): Promise<Map<string, string>> {
  const admin = createAdminClient()
  const emailById = new Map<string, string>()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`No se pudo listar usuarios: ${error.message}`)
    for (const user of data.users) {
      if (user.email) emailById.set(user.id, user.email)
    }
    if (data.users.length < perPage) break
    page += 1
  }

  return emailById
}

export async function sendPromotionalEmail(
  _prevState: EmailActionState,
  formData: FormData
): Promise<EmailActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!adminProfile || adminProfile.role !== 'admin') return { error: 'No autorizado.' }

  const subject = ((formData.get('subject') as string) || '').trim()
  const body = ((formData.get('body') as string) || '').trim()
  if (!subject) return { error: 'El asunto es obligatorio.' }
  if (!body) return { error: 'El cuerpo del mail es obligatorio.' }

  let imageUrl: string | null = null
  const imageFile = formData.get('image_file') as File | null
  if (imageFile && imageFile.size > 0) {
    const ext = ALLOWED_IMAGE_TYPES[imageFile.type]
    if (!ext) return { error: 'Formato de imagen no soportado. Usá PNG, JPEG o WebP.' }
    if (imageFile.size > MAX_IMAGE_BYTES) return { error: 'La imagen supera el límite de 5MB.' }

    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from(EMAIL_IMAGES_BUCKET)
      .upload(path, imageFile, { contentType: imageFile.type })
    if (uploadError) return { error: `No se pudo subir la imagen: ${uploadError.message}` }

    const { data } = supabase.storage.from(EMAIL_IMAGES_BUCKET).getPublicUrl(path)
    imageUrl = data.publicUrl
  }

  const { data: eligibleProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, unsubscribe_token')
    .eq('role', 'cliente')
    .eq('email_opt_out', false)
  if (profilesError) return { error: profilesError.message }

  const emailById = await listAllUserEmails()
  const siteUrl = getSiteUrl()

  const recipients = (eligibleProfiles ?? [])
    .map((p) => ({ email: emailById.get(p.id), unsubscribeToken: p.unsubscribe_token }))
    .filter((r): r is { email: string; unsubscribeToken: string } => Boolean(r.email))

  const eligible = recipients.length
  if (eligible === 0) return { result: { sent: 0, failed: 0, eligible: 0 } }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0

  for (const batch of chunk(recipients, BATCH_SIZE)) {
    const payload = batch.map((r) => ({
      from: RESEND_FROM,
      to: r.email,
      subject,
      html: buildPromotionalEmailHtml({
        subject,
        body,
        imageUrl,
        unsubscribeUrl: `${siteUrl}/unsubscribe?token=${r.unsubscribeToken}`,
      }),
    }))

    try {
      const { data, error } = await resend.batch.send(payload, { batchValidation: 'permissive' })
      if (error) {
        failed += batch.length
      } else {
        const errorCount = 'errors' in data && data.errors ? data.errors.length : 0
        sent += data.data.length
        failed += errorCount
      }
    } catch {
      failed += batch.length
    }

    await sleep(BATCH_DELAY_MS)
  }

  return { result: { sent, failed, eligible } }
}
