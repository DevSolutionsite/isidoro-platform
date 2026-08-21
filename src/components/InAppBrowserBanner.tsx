'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { InAppBrowserInfo } from '@/lib/inAppBrowser'
import { inAppBannerDismissedStore } from '@/lib/inAppBannerDismissed'

interface InAppBrowserBannerProps {
  initial: InAppBrowserInfo
}

const APP_LABEL: Record<NonNullable<InAppBrowserInfo['app']>, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  line: 'Line',
  wechat: 'WeChat',
}

// Instagram y Facebook muestran el menú "⋯" arriba a la derecha con esa
// wording exacta en español. El resto de las apps varía la posición y el
// texto entre versiones, así que les damos una instrucción genérica.
const SPECIFIC_INSTRUCTION = new Set(['instagram', 'facebook'])

export function InAppBrowserBanner({ initial: info }: InAppBrowserBannerProps) {
  const redirectAttempted = useRef(false)

  useEffect(() => {
    if (!info.isInApp || !info.isAndroid || redirectAttempted.current) return
    redirectAttempted.current = true

    // Intent URI: Android puede entregarle esto a Chrome incluso viniendo
    // de un WebView de terceros. No es garantizado — Instagram/Facebook
    // interceptan esta navegación en algunas versiones de su app y la
    // tratan como link interno. Si funciona, la página se descarga sola
    // antes de que el usuario llegue a ver el banner; si no, el banner
    // ya está en pantalla como fallback.
    const { host, pathname, search } = window.location
    const intentUrl = `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end;`
    window.location.href = intentUrl
  }, [info])

  if (!info.isInApp) return null

  return <BannerContent app={info.app} />
}

function BannerContent({ app }: { app: InAppBrowserInfo['app'] }) {
  const [copied, setCopied] = useState(false)
  const dismissed = useSyncExternalStore(
    inAppBannerDismissedStore.subscribe,
    inAppBannerDismissedStore.getSnapshot,
    inAppBannerDismissedStore.getServerSnapshot,
  )

  if (dismissed) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API puede no estar disponible (contexto no seguro,
      // permisos denegados) — el usuario igual puede copiar el link
      // manualmente desde la barra de direcciones del in-app browser.
    }
  }

  const label = app ? APP_LABEL[app] : 'esta app'
  const instruction =
    app && SPECIFIC_INSTRUCTION.has(app)
      ? 'tocá los ⋯ (tres puntos) arriba a la derecha y elegí "Abrir en el navegador"'
      : 'buscá la opción "Abrir en el navegador" en el menú de la app'

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex flex-col gap-2 border-b border-border bg-surface px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="leading-snug">
        Estás viendo esta página dentro de {label}. Para usar el login con
        Google necesitás abrirla en tu navegador: {instruction}.
      </p>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-brand hover:text-background"
        >
          {copied ? '¡Copiado!' : 'Copiar link'}
        </button>
        <button
          type="button"
          onClick={inAppBannerDismissedStore.dismiss}
          aria-label="Cerrar aviso"
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-alt hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
