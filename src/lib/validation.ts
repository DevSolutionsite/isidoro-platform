export const DNI_REGEX = /^\d{7,8}$/
export const PHONE_REGEX = /^\d{10}$/
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export function normalizePhone(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, '')
  return digitsOnly.startsWith('54') && digitsOnly.length > 10
    ? digitsOnly.slice(2)
    : digitsOnly
}
