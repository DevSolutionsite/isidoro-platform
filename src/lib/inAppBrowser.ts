export type InAppBrowserName = 'instagram' | 'facebook' | 'tiktok' | 'line' | 'wechat'

export interface InAppBrowserInfo {
  isInApp: boolean
  app: InAppBrowserName | null
  isAndroid: boolean
}

const PATTERNS: Array<[InAppBrowserName, RegExp]> = [
  ['instagram', /Instagram/i],
  ['facebook', /FBAN|FBAV|FB_IAB/i],
  ['tiktok', /BytedanceWebview|musical_ly/i],
  ['line', /Line\//i],
  ['wechat', /MicroMessenger/i],
]

export function detectInAppBrowser(userAgent: string): InAppBrowserInfo {
  const match = PATTERNS.find(([, pattern]) => pattern.test(userAgent))

  return {
    isInApp: match !== undefined,
    app: match ? match[0] : null,
    isAndroid: /Android/i.test(userAgent),
  }
}
