import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'

export const getCachedSettings = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('settings')
      .select('points_per_peso, timezone')
      .single()

    return data
  },
  ['settings'],
  { tags: ['settings'], revalidate: 900 }
)
