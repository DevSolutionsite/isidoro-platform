// TODO: reemplazar con los links reales de las redes de Isidoro
const SOCIAL_LINKS = {
  whatsapp: 'PENDIENTE_LINK_WHATSAPP',
  facebook: 'PENDIENTE_LINK_FACEBOOK',
  instagram: 'PENDIENTE_LINK_INSTAGRAM',
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

function WhatsAppIcon() {
  return (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.484 1.34 5.002L2 22l5.116-1.334a9.96 9.96 0 0 0 4.888 1.28h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.671-1.04-5.182-2.929-7.071a9.935 9.935 0 0 0-7.072-2.875zm5.85 15.847a8.28 8.28 0 0 1-5.85 2.423h-.003a8.284 8.284 0 0 1-4.223-1.155l-.303-.18-3.037.792.811-2.96-.198-.304a8.264 8.264 0 0 1-1.267-4.42c0-4.582 3.73-8.312 8.315-8.312a8.26 8.26 0 0 1 5.877 2.435 8.259 8.259 0 0 1 2.435 5.877 8.285 8.285 0 0 1-2.557 5.804z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.526 1.492-3.921 3.777-3.921 1.094 0 2.238.196 2.238.196v2.475h-1.26c-1.243 0-1.63.775-1.63 1.57v1.887h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.918 8.437-9.94Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

const SOCIAL_ITEMS = [
  { key: 'whatsapp', href: SOCIAL_LINKS.whatsapp, label: 'WhatsApp', Icon: WhatsAppIcon },
  { key: 'facebook', href: SOCIAL_LINKS.facebook, label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagram', href: SOCIAL_LINKS.instagram, label: 'Instagram', Icon: InstagramIcon },
]

export function SocialFooter() {
  return (
    <footer className="flex items-center justify-center gap-4 py-6">
      {SOCIAL_ITEMS.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--brand)' }}
        >
          <Icon />
        </a>
      ))}
    </footer>
  )
}
