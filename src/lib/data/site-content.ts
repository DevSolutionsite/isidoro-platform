import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'

export const getCachedSiteContent = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('site_content')
      .select('hero_images, hours_text')
      .single()

    return data
  },
  ['site-content'],
  { tags: ['site-content'] }
)
