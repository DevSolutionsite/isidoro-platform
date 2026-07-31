import type { Metadata } from 'next'
import Link from 'next/link'
import { IsidoroLogo } from '@/components/IsidoroLogo'
import { HeroCarousel } from '@/components/home/HeroCarousel'
import { SocialFooter } from '@/components/home/SocialFooter'

export const metadata: Metadata = {
  title: 'Isidoro — Bienvenido',
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--background)' }}>
      <header className="flex items-center justify-center py-6">
        <IsidoroLogo height={56} />
      </header>

      <main className="relative flex h-[70vh] min-h-[420px] flex-1 items-end justify-center overflow-hidden md:h-screen md:items-center">
        <HeroCarousel />

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

      <SocialFooter />
    </div>
  )
}
