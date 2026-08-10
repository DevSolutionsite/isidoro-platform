import Image from 'next/image'
import logo1 from '../../public/logo1.png'

interface IsidoroLogoProps {
  height?: number
}

export function IsidoroLogo({ height = 48 }: IsidoroLogoProps) {
  return (
    <Image
      src={logo1}
      alt="Isidoro"
      height={height}
      width={height}
      priority
      style={{ height, width: 'auto' }}
    />
  )
}
