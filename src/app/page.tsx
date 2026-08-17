import type { Metadata } from 'next'
import Link from 'next/link'
import { IsidoroLogo } from '@/components/IsidoroLogo'
import { HeroCarousel } from '@/components/home/HeroCarousel'
import { SocialFooter } from '@/components/home/SocialFooter'
import { getCachedSiteContent } from '@/lib/data/site-content'

export const metadata: Metadata = {
  title: 'Isidoro — Bienvenido',
}

// Forzado a dinámico: con CSP por nonce (ver src/proxy.ts), una página
// prerenderizada en build time no tiene forma de recibir el nonce por
// request — sus <script> inline quedarían sin nonce y el navegador los
// bloquearía, rompiendo la hidratación de esta página.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const siteContent = await getCachedSiteContent()

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--background)' }}>
      <header className="flex items-center justify-center py-6">
        <IsidoroLogo height={66} />
      </header>

      <main className="relative flex h-[70vh] min-h-[420px] flex-1 items-end justify-center overflow-hidden md:h-screen md:items-center">
        <HeroCarousel images={siteContent?.hero_images} />

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 pb-16 text-center md:pb-0">
          <h1
            className="max-w-md text-3xl font-semibold leading-tight font-display md:text-5xl"
            style={{ color: '#f5efe6' }}
          >
            Sabores que se disfrutan, puntos que se acumulan
          </h1>

          <Link
            href="/carta"
            className="rounded-full px-8 py-4 text-base font-bold tracking-wide transition-opacity hover:opacity-90 md:text-lg"
            style={{ background: '#ca9e69', color: '#1f352a' }}
          >
            Ver la carta
          </Link>
        </div>
      </main>

      {siteContent?.hours_text && (
        <div className="px-6 py-8 text-center">
          <p
            className="mx-auto max-w-md whitespace-pre-line text-sm leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {siteContent.hours_text}
          </p>
        </div>
      )}

      <SocialFooter />
    </div>
  )
}
