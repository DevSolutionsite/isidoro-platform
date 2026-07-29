'use client'

import { useState } from 'react'
import { slugify } from '@/lib/utils'
import type { Category } from '@/lib/types'

interface CategoryTabsProps {
  categories: Pick<Category, 'id' | 'name'>[]
}

export function CategoryTabs({ categories }: CategoryTabsProps) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '')

  function scrollToSection(category: Pick<Category, 'id' | 'name'>) {
    setActiveId(category.id)
    const el = document.getElementById(`section-${slugify(category.name)}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav
      className="sticky top-0 z-10 overflow-x-auto border-b border-border bg-surface"
      aria-label="Categorías del menú"
    >
      <div className="flex min-w-max gap-1 px-3 py-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToSection(cat)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors${
              activeId === cat.id
                ? ' bg-brand text-white'
                : ' text-text-muted hover:bg-surface-alt hover:text-foreground'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  )
}
