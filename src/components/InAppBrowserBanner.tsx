'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
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
  const dismissed = useSyncExternalStore(
    inAppBannerDismissedStore.subscribe,
    inAppBannerDismissedStore.getSnapshot,
    inAppBannerDismissedStore.getServerSnapshot,
  )

  if (dismissed) return null

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 flex items-start gap-3 border-t-2 border-brand bg-brand-light px-4 py-3 text-foreground"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-background"
      >
        ↗
      </span>
      <div className="flex-1">
        <p className="text-[13px] font-bold leading-snug">
          Se disfruta mejor en tu navegador.
        </p>
        <p className="mt-0.5 text-[13px] font-medium leading-snug text-text-muted">
          Tocá <span className="font-bold text-brand">⋯</span> y elegí
          &quot;Abrir en el navegador&quot;.
        </p>
      </div>
      <button
        type="button"
        onClick={inAppBannerDismissedStore.dismiss}
        aria-label="Cerrar aviso"
        className="mt-0.5 shrink-0 rounded-full p-1.5 text-text-muted transition-colors hover:text-foreground"
      >
        ✕
      </button>
    </div>
  )
}
