'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { InAppBrowserInfo } from '@/lib/inAppBrowser'
import { inAppBannerDismissedStore } from '@/lib/inAppBannerDismissed'

interface InAppBrowserBannerProps {
  initial: InAppBrowserInfo
}

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

  return <BannerContent />
}

function BannerContent() {
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

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-center gap-3 border-t-2 border-brand bg-brand-light px-4 py-2.5 text-foreground"
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-background"
      >
        ↗
      </span>
      <p className="flex-1 text-[13px] font-medium leading-snug">
        Se disfruta mejor en tu navegador.
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="whitespace-nowrap rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-background transition-opacity hover:opacity-90"
        >
          {copied ? '¡Copiado!' : 'Copiar link'}
        </button>
        <button
          type="button"
          onClick={inAppBannerDismissedStore.dismiss}
          aria-label="Cerrar aviso"
          className="rounded-full p-1.5 text-text-muted transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
