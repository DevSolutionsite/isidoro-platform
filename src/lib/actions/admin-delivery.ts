'use server'

import { redirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ToggleDeliveryResult = { ok: true } | { ok: false; code: string }

// Server Actions son endpoints propios, invocables sin pasar por la página
// que los renderiza — el gate de (admin)/layout.tsx no alcanza. Se verifica
// el rol acá explícitamente en vez de confiar solo en la RLS, mismo
// criterio que updateUserRole (ver admin-users.ts).
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') redirect('/login')
}

export async function toggleCategoryDelivery(
  categoryId: string,
  available: boolean,
): Promise<ToggleDeliveryResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('categories')
    .update({ available_for_delivery: available })
    .eq('id', categoryId)

  if (error) return { ok: false, code: error.message }

  revalidatePath('/admin/delivery')
  revalidateTag('categories', { expire: 0 })
  return { ok: true }
}

export async function toggleProductDelivery(
  productId: string,
  available: boolean,
): Promise<ToggleDeliveryResult> {
  const supabase = await createClient()
  await requireAdmin(supabase)

  const { error } = await supabase
    .from('products')
    .update({ available_for_delivery: available })
    .eq('id', productId)

  if (error) return { ok: false, code: error.message }

  revalidatePath('/admin/delivery')
  return { ok: true }
}
