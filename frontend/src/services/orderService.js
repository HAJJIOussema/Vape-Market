import { apiRequest } from './api.js'
export const getOrders = () => apiRequest('/orders')
export const createOrder = (order, idempotencyKey) => apiRequest('/orders', {
  method: 'POST',
  headers: { 'Idempotency-Key': idempotencyKey },
  body: JSON.stringify(order),
})
export const getAdminOrders = () => apiRequest('/admin/orders?page_size=100')
export const confirmAdminOrder = (orderId) => apiRequest(`/admin/orders/${orderId}/confirm`, { method: 'POST' })
export const cancelAdminOrder = (orderId) => apiRequest(`/admin/orders/${orderId}/cancel`, { method: 'POST' })
