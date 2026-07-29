'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/categorias', label: 'Categorías' },
  { href: '/admin/promociones', label: 'Promociones' },
  { href: '/admin/ofertas', label: 'Ofertas por horario' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/estadisticas', label: 'Estadísticas' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: active ? 'var(--brand-light)' : 'transparent',
              color: active ? 'var(--brand)' : 'var(--text-muted)',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
