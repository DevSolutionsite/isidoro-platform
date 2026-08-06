'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

// Fallback si el admin todavía no cargó imágenes propias en /admin/inicio
const FALLBACK_SLIDES = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1600&q=80',
]

const ROTATE_MS = 5000

function markShown(prev: Set<number>, i: number): Set<number> {
  return prev.has(i) ? prev : new Set(prev).add(i)
}

export function HeroCarousel({ images }: { images?: string[] }) {
  const slides = images?.length ? images : FALLBACK_SLIDES

  const [index, setIndex] = useState(0)
  const [shownIndices, setShownIndices] = useState<Set<number>>(() => new Set([0]))

  const goTo = (i: number) => {
    setIndex(i)
    setShownIndices((prev) => markShown(prev, i))
  }

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % slides.length
        setShownIndices((prev) => markShown(prev, next))
        return next
      })
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [slides.length])

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {slides.map((src, i) =>
        shownIndices.has(i) ? (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="100vw"
            priority={i === 0}
            className="object-cover transition-opacity duration-1000 ease-in-out"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ) : null
      )}

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
        {slides.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Ir a la imagen ${i + 1}`}
            onClick={() => goTo(i)}
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
