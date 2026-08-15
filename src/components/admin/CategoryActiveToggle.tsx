'use client'

import { useState, useTransition } from 'react'
import { toggleCategoryActive } from '@/lib/actions/admin-categories'

interface CategoryActiveToggleProps {
  categoryId: string
  initialActive: boolean
  categoryName: string
}

export function CategoryActiveToggle({
  categoryId,
  initialActive,
  categoryName,
}: CategoryActiveToggleProps) {
  const [active, setActive] = useState(initialActive)
  const [, startTransition] = useTransition()

  function handleChange(next: boolean) {
    const prev = active
    setActive(next)
    startTransition(async () => {
      const result = await toggleCategoryActive(categoryId, next)
      if (!result.ok) setActive(prev)
    })
  }

  return (
    <label
      className="inline-flex items-center gap-2 text-xs"
      style={{ color: 'var(--text-muted)' }}
    >
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 rounded accent-brand"
        aria-label={`Activa en la carta: ${categoryName}`}
      />
      Activa
    </label>
  )
}
