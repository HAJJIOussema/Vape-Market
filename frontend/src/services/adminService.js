import { apiRequest } from './api.js'

const collection = (path, params = 'page_size=100') => apiRequest(`${path}?${params}`)

export const getAdminProducts = () => collection('/products')
export const getAdminCategories = () => apiRequest('/admin/categories')
export const createAdminCategory = (payload) => apiRequest('/admin/categories', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const updateAdminCategory = (id, payload) => apiRequest(`/admin/categories/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
export const deleteAdminCategory = (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' })
export const getAdminBrands = () => apiRequest('/admin/brands')
export const createAdminBrand = (payload) => apiRequest('/admin/brands', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const updateAdminBrand = (id, payload) => apiRequest(`/admin/brands/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
export const deleteAdminBrand = (id) => apiRequest(`/admin/brands/${id}`, { method: 'DELETE' })
export const getAdminOrders = () => collection('/admin/orders')
export const getAdminInventory = () => collection('/admin/inventory')
export const getInventoryMovements = () => collection('/admin/inventory/movements')
export const adjustInventory = (variantId, payload) => apiRequest(`/admin/inventory/${variantId}/adjust`, {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const getAdminUsers = () => collection('/admin/users')
export const getAdminUser = (id) => apiRequest(`/admin/users/${id}`)

export const createAdminProduct = (payload) => apiRequest('/admin/products', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const updateAdminProduct = (id, payload) => apiRequest(`/admin/products/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
export const deleteAdminProduct = (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' })
export const getAdminProductVariants = (productId) => apiRequest(`/admin/products/${productId}/variants`)
export const createAdminProductVariant = (productId, payload) => apiRequest(`/admin/products/${productId}/variants`, {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const updateAdminProductVariant = (id, payload) => apiRequest(`/admin/variants/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
export const deleteAdminProductVariant = (id) => apiRequest(`/admin/variants/${id}`, { method: 'DELETE' })
