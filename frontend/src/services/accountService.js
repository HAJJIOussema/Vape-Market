import { apiRequest } from './api.js'

export const getProfile = () => apiRequest('/profile')
export const updateProfile = (payload) => apiRequest('/profile', {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
export const getAddresses = () => apiRequest('/addresses')
export const createAddress = (payload) => apiRequest('/addresses', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const updateAddress = (id, payload) => apiRequest(`/addresses/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
export const deleteAddress = (id) => apiRequest(`/addresses/${id}`, { method: 'DELETE' })
export const getOrders = () => apiRequest('/orders?page_size=100')
