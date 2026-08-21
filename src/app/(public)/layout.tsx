import { headers } from 'next/headers'
import { detectInAppBrowser } from '@/lib/inAppBrowser'
import { InAppBrowserBanner } from '@/components/InAppBrowserBanner'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const info = detectInAppBrowser(headersList.get('user-agent') ?? '')

  return (
    <>
      <InAppBrowserBanner initial={info} />
      {children}
    </>
  )
}
