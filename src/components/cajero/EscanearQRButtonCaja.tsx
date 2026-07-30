'use client'

import { EscanearQRButton } from './EscanearQRButton'
import { useClienteBusquedaNav } from './useClienteBusquedaNav'

export function EscanearQRButtonCaja() {
  const search = useClienteBusquedaNav()
  return <EscanearQRButton onDecode={search} />
}
