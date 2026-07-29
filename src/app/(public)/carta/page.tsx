import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { IsidoroLogo } from '@/components/IsidoroLogo'
import { slugify } from '@/lib/utils'
import { CategoryMenu } from '@/components/carta/CategoryMenu'
import { ProductCard } from '@/components/carta/ProductCard'
import { PromoCarousel } from '@/components/carta/PromoCarousel'
import type { Promotion, ProductWithDiscount, PromoSlide } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Carta — Isidoro',
  description: 'Menú digital del Restaurante Isidoro',
}

function isPromotionActive(promo: Promotion): boolean {
  const now = new Date()
  return (
    promo.is_active &&
    new Date(promo.valid_from) <= now &&
    now <= new Date(promo.valid_until)
  )
}

function isTimeOfferActive(
  offer: { is_active: boolean; start_time: string; end_time: string },
  timezone: string,
): boolean {
  if (!offer.is_active) return false
  const nowInTZ = new Date().toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const { start_time, end_time } = offer
  if (start_time <= end_time) {
    return nowInTZ >= start_time && nowInTZ <= end_time
  }
  // Oferta que cruza medianoche (ej. 22:00–02:00): activa fuera del "hueco" entre end y start
  return nowInTZ >= start_time || nowInTZ <= end_time
}

export default async function CartaPage() {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: settings },
    { data: categories },
    { data: products },
    { data: promotions },
    { data: timeOffers },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('settings').select('points_per_peso, timezone').single(),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select('*, categories(name, sort_order)')
      .eq('is_available', true)
      .order('sort_order', { ascending: true }),
    supabase.from('promotions').select('*').eq('is_active', true),
    supabase
      .from('time_offers')
      .select('*, time_offer_products(product_id, price_override)')
      .eq('is_active', true),
  ])

  const timezone = settings?.timezone ?? 'America/Argentina/Buenos_Aires'
  const pointsPerPeso = settings?.points_per_peso ?? 1

  const activePromos = (promotions ?? []).filter(isPromotionActive)
  const activeTimeOffers = (timeOffers ?? []).filter((o) => isTimeOfferActive(o, timezone))

  // Build discount map from embedded time_offer_products (DEC-013)
  const discountMap = new Map<string, number>()
  for (const offer of activeTimeOffers) {
    for (const top of offer.time_offer_products ?? []) {
      if (top.price_override != null) {
        discountMap.set(top.product_id, top.price_override)
      }
    }
  }

  const productsWithDiscount: ProductWithDiscount[] = (products ?? []).map((p) => ({
    ...p,
    discount_price: discountMap.get(p.id) ?? null,
  }))

  const slides: PromoSlide[] = [
    ...activeTimeOffers.map((offer): PromoSlide => {
      const tops = offer.time_offer_products ?? []
      const top = tops[0] ?? null
      const product = top ? (products ?? []).find((p) => p.id === top.product_id) : null
      return {
        id: offer.id,
        badge: 'AHORA',
        title: offer.name,
        description: offer.description,
        price: top?.price_override ?? product?.price ?? null,
        originalPrice: product && top?.price_override != null ? product.price : null,
      }
    }),
    ...activePromos.map((promo): PromoSlide => ({
      id: promo.id,
      badge: 'PROMO',
      title: promo.name,
      description: promo.description,
      price: null,
      originalPrice: null,
    })),
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-3 py-3">
          <CategoryMenu categories={categories ?? []} />

          <div className="flex items-center justify-center">
            <IsidoroLogo height={48} />
          </div>

          <Link
            href={user ? '/perfil' : '/login'}
            className="p-2 rounded-md transition-opacity hover:opacity-60"
            style={{ color: 'var(--foreground)' }}
            aria-label={user ? 'Ir a mi perfil' : 'Iniciar sesión'}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        </div>
      </header>

      {slides.length > 0 && <PromoCarousel slides={slides} />}

      <main className="pb-10">
        {(categories ?? []).map((category) => {
          const categoryProducts = productsWithDiscount
            .filter((p) => p.category_id === category.id)
            .sort((a, b) => a.sort_order - b.sort_order)

          if (categoryProducts.length === 0) return null

          return (
            <section
              key={category.id}
              id={`section-${slugify(category.name)}`}
              className="scroll-mt-16"
            >
              <h2
                className="px-4 pb-4 pt-10 text-2xl font-semibold font-display"
                style={{ color: 'var(--foreground)' }}
              >
                {category.name}
              </h2>
              <div className="flex flex-col gap-4 px-4">
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pointsPerPeso={pointsPerPeso}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
