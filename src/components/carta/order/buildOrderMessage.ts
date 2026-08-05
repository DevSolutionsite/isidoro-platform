import { formatARS } from '@/lib/utils'
import { RESTAURANT_WHATSAPP_NUMBER } from '@/lib/constants'
import type { ProductWithDiscount } from '@/lib/types'

export type OrderCartLine = { productId: string; quantity: number }

export type OrderCustomerData = {
  name: string
  modality: 'retiro' | 'delivery'
  address: string
  payment: 'efectivo' | 'transferencia'
}

export function effectivePrice(product: ProductWithDiscount): number {
  return product.discount_price ?? product.price
}

export function buildOrderMessage(
  lines: OrderCartLine[],
  productsById: Map<string, ProductWithDiscount>,
  customer: OrderCustomerData,
): string {
  const itemLines = lines
    .map((line) => {
      const product = productsById.get(line.productId)
      if (!product) return null
      const subtotal = effectivePrice(product) * line.quantity
      return `• ${line.quantity}x ${product.name} — ${formatARS(subtotal)}`
    })
    .filter((l): l is string => l !== null)

  const total = lines.reduce((sum, line) => {
    const product = productsById.get(line.productId)
    return product ? sum + effectivePrice(product) * line.quantity : sum
  }, 0)

  const modalityLines =
    customer.modality === 'delivery'
      ? [`*Modalidad:* Delivery`, `*Dirección:* ${customer.address}`]
      : [`*Modalidad:* Retiro en el local`]

  const paymentLabel = customer.payment === 'efectivo' ? 'Efectivo' : 'Transferencia'

  return [
    '¡Hola! Quiero hacer un pedido 🍽️',
    '',
    '*Productos:*',
    ...itemLines,
    '',
    `*Total: ${formatARS(total)}*`,
    '',
    `*Nombre:* ${customer.name}`,
    ...modalityLines,
    `*Método de pago:* ${paymentLabel}`,
  ].join('\n')
}

export function buildWhatsAppOrderUrl(message: string): string {
  return `https://wa.me/${RESTAURANT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
