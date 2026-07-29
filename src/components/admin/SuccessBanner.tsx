const MESSAGES: Record<string, string> = {
  created: 'Creado correctamente.',
  updated: 'Actualizado correctamente.',
  deleted: 'Eliminado correctamente.',
}

interface SuccessBannerProps {
  type: string | undefined
}

export function SuccessBanner({ type }: SuccessBannerProps) {
  if (!type || !MESSAGES[type]) return null

  return (
    <div
      className="px-6 py-3 text-sm font-medium"
      style={{ background: 'rgba(202,158,105,0.15)', color: 'var(--brand)', borderBottom: '1px solid var(--border)' }}
    >
      ✓ {MESSAGES[type]}
    </div>
  )
}
