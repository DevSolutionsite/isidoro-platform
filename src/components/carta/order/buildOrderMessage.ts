import { formatARS } from '@/lib/utils'
import { RESTAURANT_WHATSAPP_NUMBER } from '@/lib/constants'
import type { ProductWithDiscount } from '@/lib/types'

export type OrderCartLine = { productId: string; quantity: number }

export type PaymentMethod = 'efectivo' | 'transferencia' | 'qr' | 'debito' | 'credito'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  qr: 'QR',
  debito: 'Débito',
  credito: 'Crédito',
}

export const DELIVERY_DISABLED_PAYMENT_METHODS: PaymentMethod[] = ['debito', 'credito']

export type OrderCustomerData = {
  name: string
  modality: 'retiro' | 'delivery'
  address: string
  payment: PaymentMethod
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

  const paymentLabel = PAYMENT_METHOD_LABELS[customer.payment]

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
