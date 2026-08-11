'use client'

import { useState } from 'react'
import { HeroImageThumb } from './HeroImageThumb'
import { AddHeroImageForm } from './AddHeroImageForm'
import { addHeroImage, removeHeroImage, moveHeroImage } from '@/lib/actions/admin-site-content'

interface Props {
  initialImages: string[]
}

export function HeroImagesSection({ initialImages }: Props) {
  const [images, setImages] = useState(initialImages)
  const [error, setError] = useState<string | null>(null)

  async function handleRemove(url: string) {
    setError(null)
    try {
      const res = await removeHeroImage(url)
      if (!res.ok) {
        setError('No se pudo quitar la imagen.')
        return
      }
      setImages((prev) => prev.filter((img) => img !== url))
    } catch {
      setError('No se pudo quitar la imagen.')
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    setError(null)
    try {
      const res = await moveHeroImage(index, direction)
      if (!res.ok) {
        setError('No se pudo mover la imagen.')
        return
      }
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= images.length) return
      setImages((prev) => {
        const next = [...prev]
        const [moved] = next.splice(index, 1)
        next.splice(target, 0, moved)
        return next
      })
    } catch {
      setError('No se pudo mover la imagen.')
    }
  }

  return (
    <div>
      {error && (
        <p className="text-xs mb-2" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, i) => (
            <HeroImageThumb
              key={url}
              src={url}
              onMoveUp={i > 0 ? () => handleMove(i, 'up') : undefined}
              onMoveDown={i < images.length - 1 ? () => handleMove(i, 'down') : undefined}
              onRemove={() => handleRemove(url)}
            />
          ))}
        </div>
      )}

      <AddHeroImageForm action={addHeroImage} onAdded={(url) => setImages((prev) => [...prev, url])} />
    </div>
  )
}
