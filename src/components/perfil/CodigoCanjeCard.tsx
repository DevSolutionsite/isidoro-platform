'use client'

import { useEffect, useState } from 'react'

interface Props {
  code:       string
  expiresAt:  string
  rewardName: string
}

export function CodigoCanjeCard({ code, expiresAt, rewardName }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  )

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(id); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [secondsLeft])

  const expired = secondsLeft <= 0
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

        {/* Close */}
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
      </div>
    </div>
  )
}
