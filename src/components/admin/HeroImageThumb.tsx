'use client'

import { useState } from 'react'

interface HeroImageThumbProps {
  src: string
  onMoveUp?: () => Promise<void>
  onMoveDown?: () => Promise<void>
  onRemove: () => Promise<void>
}

export function HeroImageThumb({ src, onMoveUp, onMoveDown, onRemove }: HeroImageThumbProps) {
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<void>) {
    setPending(true)
    await action()
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--border)', opacity: pending ? 0.5 : 1 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- URL pública de storage, no pasa por el optimizador */}
      <img src={src} alt="" className="block h-28 w-full object-cover" />
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 px-1 py-1"
        style={{ background: 'rgba(31,53,42,0.75)' }}
      >
        <button
          type="button"
          disabled={pending || !onMoveUp}
          onClick={() => onMoveUp && run(onMoveUp)}
          className="rounded px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-70 disabled:opacity-30"
          aria-label="Mover antes"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(onRemove)}
          className="rounded px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-30"
          style={{ color: '#f87171' }}
          aria-label="Quitar imagen"
        >
          ✕
        </button>
        <button
          type="button"
          disabled={pending || !onMoveDown}
          onClick={() => onMoveDown && run(onMoveDown)}
          className="rounded px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-70 disabled:opacity-30"
          aria-label="Mover después"
        >
          ↓
        </button>
      </div>
    </div>
  )
}
