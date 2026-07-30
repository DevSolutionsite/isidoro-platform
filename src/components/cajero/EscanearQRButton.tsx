'use client'

import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

const ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: 'Activá el permiso de cámara en la configuración del navegador y volvé a intentar',
  PermissionDeniedError: 'Activá el permiso de cámara en la configuración del navegador y volvé a intentar',
  NotFoundError: 'No se encontró cámara en este dispositivo',
  DevicesNotFoundError: 'No se encontró cámara en este dispositivo',
  NotReadableError: 'La cámara está siendo usada por otra aplicación',
  TrackStartError: 'La cámara está siendo usada por otra aplicación',
}

function mapCameraError(err: unknown): string {
  const name = err instanceof Error ? err.name : ''
  return ERROR_MESSAGES[name] ?? 'No se pudo iniciar la cámara. Usá la búsqueda por nombre.'
}

export function EscanearQRButton({ onDecode }: { onDecode: (value: string) => void }) {
  const onDecodeRef = useRef(onDecode)
  useEffect(() => {
    onDecodeRef.current = onDecode
  }, [onDecode])

  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    if (!open || !videoRef.current) return

    let cancelled = false

    async function startScanner() {
      const hasCamera = await QrScanner.hasCamera()
      if (cancelled) return
      if (!hasCamera) {
        setError('No se encontró cámara en este dispositivo')
        return
      }

      const scanner = new QrScanner(
        videoRef.current!,
        (result) => {
          scanner.stop()
          setOpen(false)
          onDecodeRef.current(result.data.trim())
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      )
      scannerRef.current = scanner

      try {
        await scanner.start()
      } catch (err) {
        if (!cancelled) setError(mapCameraError(err))
      }
    }

    startScanner()

    return () => {
      cancelled = true
      scannerRef.current?.stop()
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, [open])

  function close() {
    setOpen(false)
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
        style={{
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      >
        Escanear QR
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                Escaneá el QR del cliente
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {error ? (
              <div
                className="rounded-xl px-4 py-6 text-center text-sm"
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.30)',
                  color: '#f87171',
                }}
              >
                {error}
              </div>
            ) : (
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full rounded-xl"
                style={{ background: '#000' }}
              />
            )}

            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              Buscar por nombre en su lugar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
