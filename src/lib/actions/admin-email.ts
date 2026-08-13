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

export interface ClientSearchResult {
  id: string
  full_name: string
  phone: string | null
  email: string
  email_opt_out: boolean
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
const CLIENT_SEARCH_LIMIT = 8
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!adminProfile || adminProfile.role !== 'admin') return null

  return supabase
}

export async function searchClients(query: string): Promise<ClientSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const supabase = await requireAdmin()
  if (!supabase) return []

  // Comas y paréntesis rompen la sintaxis del filtro .or() de PostgREST.
  const safe = trimmed.replace(/[%,()]/g, ' ').trim()
  if (!safe) return []

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email_opt_out')
    .eq('role', 'cliente')
    .or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`)
    .limit(CLIENT_SEARCH_LIMIT)
  if (error || !profiles || profiles.length === 0) return []

  const admin = createAdminClient()
  const results = await Promise.all(
    profiles.map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id)
      const email = data.user?.email
      if (!email) return null
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        email,
        email_opt_out: p.email_opt_out,
      }
    })
  )

  return results.filter((r): r is ClientSearchResult => r !== null)
}

export async function sendPromotionalEmail(
  _prevState: EmailActionState,
  formData: FormData
): Promise<EmailActionState> {
  const supabase = await requireAdmin()
  if (!supabase) return { error: 'No autorizado.' }

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

  const siteUrl = getSiteUrl()
  const recipientMode = ((formData.get('recipient_mode') as string) || 'all') as
    | 'all'
    | 'client'
    | 'email'

  if (recipientMode === 'client') {
    const clientId = ((formData.get('recipient_client_id') as string) || '').trim()
    if (!clientId) return { error: 'Elegí un cliente.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('unsubscribe_token, email_opt_out')
      .eq('id', clientId)
      .eq('role', 'cliente')
      .single()
    if (!profile) return { error: 'Cliente no encontrado.' }
    if (profile.email_opt_out) return { error: 'Este cliente se dio de baja de estos mails.' }

    const admin = createAdminClient()
    const { data: userData } = await admin.auth.admin.getUserById(clientId)
    const email = userData.user?.email
    if (!email) return { error: 'No se pudo obtener el email del cliente.' }

    return sendSingle({
      subject,
      body,
      imageUrl,
      to: email,
      unsubscribeUrl: `${siteUrl}/unsubscribe?token=${profile.unsubscribe_token}`,
      showUnsubscribe: true,
    })
  }

  if (recipientMode === 'email') {
    const rawEmail = ((formData.get('recipient_email') as string) || '').trim()
    if (!EMAIL_REGEX.test(rawEmail)) return { error: 'Ingresá un email válido.' }

    return sendSingle({
      subject,
      body,
      imageUrl,
      to: rawEmail,
      unsubscribeUrl: `${siteUrl}/unsubscribe`,
      showUnsubscribe: false,
    })
  }

  const { data: eligibleProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, unsubscribe_token')
    .eq('role', 'cliente')
    .eq('email_opt_out', false)
  if (profilesError) return { error: profilesError.message }

  const emailById = await listAllUserEmails()

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

async function sendSingle(params: {
  subject: string
  body: string
  imageUrl: string | null
  to: string
  unsubscribeUrl: string
  showUnsubscribe: boolean
}): Promise<EmailActionState> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: params.to,
      subject: params.subject,
      html: buildPromotionalEmailHtml({
        subject: params.subject,
        body: params.body,
        imageUrl: params.imageUrl,
        unsubscribeUrl: params.unsubscribeUrl,
        showUnsubscribe: params.showUnsubscribe,
      }),
    })
    if (error) {
      console.error('[sendPromotionalEmail] Resend error:', error)
      return { error: `No se pudo enviar el mail: ${error.message}` }
    }
    return { result: { sent: 1, failed: 0, eligible: 1 } }
  } catch (err) {
    console.error('[sendPromotionalEmail] excepción al enviar:', err)
    const message = err instanceof Error ? err.message : 'error desconocido'
    return { error: `No se pudo enviar el mail: ${message}` }
  }
}
