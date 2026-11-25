import { apiRequest } from './api.js'

export const getOrders = () => apiRequest('/orders')
/**
 * Create an order. Works for guests and logged-in customers: the backend
 * attaches the order to the account when a session exists.
 */
export const createOrder = (order, idempotencyKey) => apiRequest('/orders', {
  method: 'POST',
  headers: { 'Idempotency-Key': idempotencyKey },
  body: JSON.stringify(order),
})
export const lookupGuestOrder = (orderNumber, accessToken) => apiRequest('/orders/guest/lookup', {
  method: 'POST',
  auth: false,
  body: JSON.stringify({ order_number: orderNumber, access_token: accessToken }),
})
export const getAdminOrders = () => apiRequest('/admin/orders?page_size=100')
export const confirmAdminOrder = (orderId) => apiRequest(`/admin/orders/${orderId}/confirm`, { method: 'POST' })
export const cancelAdminOrder = (orderId) => apiRequest(`/admin/orders/${orderId}/cancel`, { method: 'POST' })

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
