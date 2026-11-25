import { run, supabase } from './db.js'

export { getOrders } from './accountService.js'

/**
 * Place an order (guest or logged-in). public.checkout validates the input
 * and computes prices, totals and shipping in the database; for a new guest
 * order it returns a one-time guest_access_token.
 */
export async function createOrder(order, idempotencyKey) {
  const data = await run(supabase.rpc('checkout', {
    p_idempotency_key: idempotencyKey,
    p_items: order.items,
    p_customer_email: order.customer_email,
    p_customer_phone: order.customer_phone,
    p_shipping_address: order.shipping_address,
  }), 'Impossible de créer la commande.')
  return { data }
}

export async function lookupGuestOrder(orderNumber, accessToken) {
  const data = await run(supabase.rpc('lookup_guest_order', {
    p_order_number: orderNumber,
    p_access_token: accessToken,
  }), 'Impossible de retrouver la commande.')
  if (!data) throw Object.assign(new Error('Aucune commande ne correspond à ce numéro et ce code.'), { status: 404 })
  return { data }
}

export async function getAdminOrders() {
  const data = await run(
    supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100),
    'Impossible de charger les commandes.',
  )
  return { data }
}

export async function confirmAdminOrder(orderId) {
  return { data: await run(supabase.rpc('confirm_order', { p_order_id: orderId }), 'Impossible de confirmer la commande.') }
}

export async function cancelAdminOrder(orderId) {
  return { data: await run(supabase.rpc('cancel_order', { p_order_id: orderId }), 'Impossible d’annuler la commande.') }
}

/** RFC 4122 v4 UUID; crypto.randomUUID is missing on plain-http LAN URLs. */
export function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
