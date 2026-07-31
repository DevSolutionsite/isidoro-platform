'use client'

import { useEffect, useState } from 'react'

// TODO: reemplazar con fotos reales de Isidoro (plato/ambiente del restaurante)
const HERO_SLIDES = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1600&q=80',
]

const ROTATE_MS = 5000

export function HeroCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {HERO_SLIDES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- placeholders externos temporales, sin next/image por no whitelistear un host que se va a reemplazar
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Oscurecido para legibilidad del contenido encima */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(31,53,42,0.55) 0%, rgba(31,53,42,0.35) 45%, rgba(31,53,42,0.92) 100%)',
        }}
      />

      {/* Indicadores */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
        {HERO_SLIDES.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Ir a la imagen ${i + 1}`}
            onClick={() => setIndex(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === index ? 20 : 6,
              background: i === index ? '#ca9e69' : 'rgba(245,239,230,0.4)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
