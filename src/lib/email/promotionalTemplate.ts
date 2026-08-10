const BRAND_GOLD = '#ca9e69'
const BRAND_DARK = '#af8460'
const FONT_DISPLAY = "Georgia, 'Times New Roman', serif"
const FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface PromotionalEmailInput {
  subject: string
  body: string
  imageUrl?: string | null
  unsubscribeUrl: string
}

// Tabla + estilos inline: es lo único que Gmail/Outlook/Apple Mail
// renderizan de forma consistente. Nada de <svg>, webfonts ni flex/grid.
export function buildPromotionalEmailHtml({
  subject,
  body,
  imageUrl,
  unsubscribeUrl,
}: PromotionalEmailInput): string {
  const safeBody = escapeHtml(body).replace(/\n/g, '<br />')
  const safeSubject = escapeHtml(subject)

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f5f1ec; font-family:${FONT_BODY};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f1ec; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 24px 16px 24px; border-bottom:1px solid #eee2d3;">
                <span style="font-family:${FONT_DISPLAY}; font-size:28px; letter-spacing:2px; color:${BRAND_GOLD};">ISIDORO</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px 8px 24px;">
                <h1 style="margin:0 0 16px 0; font-family:${FONT_DISPLAY}; font-size:22px; color:#2a2420;">${safeSubject}</h1>
                <p style="margin:0; font-size:15px; line-height:1.6; color:#3d3630;">${safeBody}</p>
              </td>
            </tr>
            ${
              imageUrl
                ? `<tr>
              <td style="padding:16px 24px;">
                <img src="${escapeHtml(imageUrl)}" alt="" width="512" style="width:100%; max-width:512px; height:auto; border-radius:8px; display:block;" />
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:24px; background-color:#faf7f2; border-top:1px solid #eee2d3;" align="center">
                <p style="margin:0 0 8px 0; font-size:12px; color:#8a7f70;">Isidoro — Programa de fidelización</p>
                <a href="${escapeHtml(unsubscribeUrl)}" style="font-size:12px; color:${BRAND_DARK}; text-decoration:underline;">Darse de baja de estos mails</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
