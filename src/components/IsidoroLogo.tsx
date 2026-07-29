interface IsidoroLogoProps {
  height?: number
}

export function IsidoroLogo({ height = 48 }: IsidoroLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 80"
      height={height}
      aria-label="Isidoro"
      role="img"
      fill="none"
    >
      {/* Cuatrifolio frame — four arcs meeting at a central square */}
      <g stroke="#ca9e69" strokeWidth="1.4" fill="none">
        {/* Top lobe */}
        <path d="M45 32 Q60 10 75 32" />
        {/* Bottom lobe */}
        <path d="M45 44 Q60 66 75 44" />
        {/* Left lobe */}
        <path d="M42 33 Q20 38 42 43" />
        {/* Right lobe */}
        <path d="M78 33 Q100 38 78 43" />
        {/* Outer connecting arcs */}
        <path d="M45 32 Q42 33 42 38" />
        <path d="M75 32 Q78 33 78 38" />
        <path d="M42 43 Q45 44 60 44" />
        <path d="M78 43 Q75 44 60 44" />
        {/* Corner decorative dots */}
        <circle cx="60" cy="14" r="1.5" fill="#ca9e69" stroke="none" />
        <circle cx="60" cy="62" r="1.5" fill="#ca9e69" stroke="none" />
        <circle cx="16" cy="38" r="1.5" fill="#ca9e69" stroke="none" />
        <circle cx="104" cy="38" r="1.5" fill="#ca9e69" stroke="none" />
        {/* Thin outer frame lines (diamond) */}
        <path d="M60 6 L104 38 L60 70 L16 38 Z" strokeWidth="0.8" opacity="0.5" />
      </g>
      {/* Central I letterform */}
      <text
        x="60"
        y="46"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="22"
        fontWeight="400"
        fill="#ca9e69"
        letterSpacing="1"
      >
        I
      </text>
      {/* ISIDORO wordmark */}
      <text
        x="60"
        y="76"
        textAnchor="middle"
        fontFamily="'Montserrat', system-ui, sans-serif"
        fontSize="7.5"
        fontWeight="600"
        fill="#ca9e69"
        letterSpacing="4"
      >
        ISIDORO
      </text>
    </svg>
  )
}
