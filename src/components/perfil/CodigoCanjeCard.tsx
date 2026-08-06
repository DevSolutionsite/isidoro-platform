'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  id:         string
  code:       string
  expiresAt:  string
  rewardName: string
}

const REDIRECT_DELAY_MS = 2000

export function CodigoCanjeCard({ id, code, expiresAt, rewardName }: Props) {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  )
  const [serverStatus, setServerStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending')

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timerId = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerId); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerId)
  }, [secondsLeft])

  // Realtime: cierra la card en el momento exacto en que el cajero confirma
  // o el código expira del lado del servidor, sin depender del countdown
  // local. El fetch inicial cubre la carrera donde el cajero ya confirmó
  // en la ventana entre initiate-redemption y este montaje.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    supabase
      .from('redemptions')
      .select('status')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data && data.status !== 'pending') {
          setServerStatus(data.status as 'confirmed' | 'expired')
        }
      })

    const channel = supabase
      .channel(`redemption-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'redemptions', filter: `id=eq.${id}` },
        (payload) => {
          const status = (payload.new as { status?: string }).status
          console.log('[realtime] evento recibido para redemption', id, '→ status:', status)
          if (status === 'confirmed' || status === 'expired') {
            setServerStatus(status)
          }
        },
      )
      .subscribe((status, err) => {
        console.log('[realtime] canal redemption-' + id + ' → status:', status)
        if (err) console.error('[realtime] canal redemption-' + id + ' → error:', err)
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    if (serverStatus !== 'confirmed') return
    const timeoutId = setTimeout(() => router.push('/perfil'), REDIRECT_DELAY_MS)
    return () => clearTimeout(timeoutId)
  }, [serverStatus, router])

  const confirmed = serverStatus === 'confirmed'
  const expired = serverStatus === 'expired' || secondsLeft <= 0
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    /* Full-screen overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {confirmed ? (
          <div className="text-center space-y-2 py-4">
            <p className="text-4xl">✓</p>
            <p className="text-base font-semibold font-display" style={{ color: 'var(--brand)' }}>
              ¡Canje confirmado!
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {rewardName}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Código de canje
              </p>
              <p className="text-base font-semibold font-display" style={{ color: 'var(--foreground)' }}>
                {rewardName}
              </p>
            </div>

            {/* 6-digit code */}
            <div className="flex justify-center gap-2">
              {code.split('').map((digit, i) => (
                <div
                  key={i}
                  className="w-12 h-14 flex items-center justify-center rounded-xl text-2xl font-bold tabular-nums"
                  style={{
                    background:  'var(--surface-alt)',
                    border:      `2px solid ${expired ? 'rgba(239,68,68,0.4)' : 'var(--brand)'}`,
                    color:        expired ? '#f87171' : 'var(--foreground)',
                  }}
                >
                  {digit}
                </div>
              ))}
            </div>

            {/* Timer / expired state */}
            {expired ? (
              <div
                className="rounded-xl px-4 py-3 text-center text-sm"
                style={{
                  background: 'rgba(239,68,68,0.10)',
                  border:     '1px solid rgba(239,68,68,0.30)',
                  color:      '#f87171',
                }}
              >
                Código vencido — generá uno nuevo
              </div>
            ) : (
              <div className="text-center">
                <p
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: secondsLeft < 60 ? '#f87171' : 'var(--brand)' }}
                >
                  {mins}:{secs}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Mostráselo al cajero antes de que venza
                </p>
              </div>
            )}
          </>
        )}

        {/* Close */}
        {!confirmed && (
          <a
            href="/perfil"
            className="block w-full rounded-xl py-3 text-sm font-semibold text-center transition-opacity hover:opacity-80"
            style={{
              background: 'var(--surface-alt)',
              border:     '1px solid var(--border)',
              color:      'var(--foreground)',
            }}
          >
            Cerrar
          </a>
        )}
      </div>
    </div>
  )
}
