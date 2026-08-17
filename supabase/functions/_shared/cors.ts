// Actualizar esta lista si cambia el dominio de producción o el puerto
// de desarrollo local — ver DEC-044 en docs/DECISIONS.md. Después de
// tocar este archivo hay que redeployar las 6 funciones que lo importan
// (Supabase empaqueta _shared/ dentro de cada función al deployar, no
// es un módulo compartido en runtime).
const ALLOWED_ORIGINS = [
  'https://isidoro-platform.vercel.app',
]

const LOCALHOST_ORIGIN_RE = /^http:\/\/localhost:\d+$/

export function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin') ?? ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || LOCALHOST_ORIGIN_RE.test(origin)

  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
