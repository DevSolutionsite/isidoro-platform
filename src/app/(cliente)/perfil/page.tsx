import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PointsCard } from '@/components/perfil/PointsCard'
import { QRDisplay } from '@/components/perfil/QRDisplay'
import { RewardsList } from '@/components/perfil/RewardsList'
import { TransactionHistory } from '@/components/perfil/TransactionHistory'
import { CodigoCanjeCard } from '@/components/perfil/CodigoCanjeCard'
import QRCode from 'qrcode'

export const metadata: Metadata = {
  title: 'Mi perfil — Isidoro',
}

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?:        string
    expires?:     string
    reward?:      string
    canje_error?: string
  }>
}) {
  const { code, expires, reward, canje_error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: balance },
    { data: transactions },
    { data: rewards },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, qr_token').eq('id', user!.id).single(),
    supabase
      .from('points_balance')
      .select('total_points, updated_at')
      .eq('client_id', user!.id)
      .single(),
    supabase
      .from('points_transactions')
      .select(
        'id, type, points, expires_at, created_at, consumptions(amount, consumed_at), redemptions(rewards(name))',
      )
      .eq('client_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true }),
  ])

  const qrSvg = profile?.qr_token
    ? await QRCode.toString(profile.qr_token, {
        type: 'svg',
        margin: 1,
        color: { dark: '#1C1917', light: '#FFFFFF' },
      })
    : null

  const totalPoints = balance?.total_points ?? 0
  const affordableRewards = (rewards ?? []).filter(
    (r) => r.is_active && totalPoints >= r.points_cost,
  )

  return (
    <div className="px-4 pb-10 space-y-6 pt-6">
      <div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Bienvenido de vuelta
        </p>
        <h1 className="text-2xl font-semibold tracking-tight font-display">
          {profile?.full_name ?? 'Cliente'}
        </h1>
      </div>

      <PointsCard points={totalPoints} />

      {affordableRewards.length > 0 && (
        <RewardsList
          rewards={affordableRewards}
          totalPoints={totalPoints}
          errorCode={canje_error}
        />
      )}

      <QRDisplay qrSvg={qrSvg} />

      {code && expires && reward && (
        <CodigoCanjeCard
          code={code}
          expiresAt={decodeURIComponent(expires)}
          rewardName={decodeURIComponent(reward)}
        />
      )}

      <TransactionHistory transactions={transactions ?? []} />
    </div>
  )
}
