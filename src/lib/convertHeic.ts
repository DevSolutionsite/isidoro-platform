import { heicTo, isHeic } from 'heic-to/csp'

const MAX_DIMENSION = 2000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const QUALITY_STEPS = [0.8, 0.6, 0.4]

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar el JPEG.'))),
      'image/jpeg',
      quality
    )
  })
}

// iOS reporta HEIC con file.type vacío o inconsistente según el picker,
// por eso isHeic() lee el magic byte real en vez de confiar en el mime/extensión.
export async function maybeConvertHeicToJpeg(file: File): Promise<File> {
  if (!(await isHeic(file))) return file

  const bitmap = await heicTo({ blob: file, type: 'bitmap' })

  // Fotos de iPhone moderno (12-48MP) muy por encima de lo que necesita la web:
  // redimensionar es lo que realmente baja el peso (HEIC comprime mucho mejor
  // que JPEG a resolución completa, por eso una conversión 1:1 puede pesar más
  // que el HEIC original).
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let blob = await canvasToBlob(canvas, QUALITY_STEPS[0])
  for (let i = 1; i < QUALITY_STEPS.length && blob.size > MAX_IMAGE_BYTES; i++) {
    blob = await canvasToBlob(canvas, QUALITY_STEPS[i])
  }

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}
