import { apiRequest } from './api.js'
export const getOrders = () => apiRequest('/orders')
export const createOrder = (order) => apiRequest('/orders', { method: 'POST', body: JSON.stringify(order) })
