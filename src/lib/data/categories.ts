import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'

export const getCachedCategories = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    return data
  },
  ['categories'],
  { tags: ['categories'] }
)
