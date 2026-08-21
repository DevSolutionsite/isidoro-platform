const KEY = 'inapp-banner-dismissed'

type Listener = () => void

const listeners = new Set<Listener>()

function getSnapshot(): boolean {
  return sessionStorage.getItem(KEY) === '1'
}

function getServerSnapshot(): boolean {
  return false
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// sessionStorage no dispara el evento nativo "storage" en la misma pestaña
// que escribe — hay que notificar a los listeners a mano.
function dismiss(): void {
  sessionStorage.setItem(KEY, '1')
  listeners.forEach((listener) => listener())
}

export const inAppBannerDismissedStore = {
  getSnapshot,
  getServerSnapshot,
  subscribe,
  dismiss,
}
