export const RESTAURANT_WHATSAPP_NUMBER = '5493496651497'

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
