import { apiRequest } from './api.js'

const collection = (path, params = 'page_size=100') => apiRequest(`${path}?${params}`)

export const getAdminProducts = () => collection('/products')
export const getAdminCategories = () => apiRequest('/categories')
export async function getAdminBrands() {
  try {
    return await collection('/brands')
  } catch (error) {
    if (error.status !== 404) throw error
    const products = dataOf(await getAdminProducts())
    const brands = new Map()
    products.forEach((product) => {
      const brand = product.brands || product.brand
      if (brand?.id) brands.set(brand.id, brand)
    })
    return { data: [...brands.values()] }
  }
}
export const getAdminOrders = () => collection('/admin/orders')
export const getAdminInventory = () => collection('/admin/inventory')
export const getInventoryMovements = () => collection('/admin/inventory/movements')
export const adjustInventory = (variantId, payload) => apiRequest(`/admin/inventory/${variantId}/adjust`, {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const getAdminUsers = () => collection('/admin/users')

export const createAdminProduct = (payload) => apiRequest('/admin/products', {
  method: 'POST',
  body: JSON.stringify(payload),
})
export const updateAdminProduct = (id, payload) => apiRequest(`/admin/products/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
export const deleteAdminProduct = (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' })

function dataOf(response) {
  return response?.data || response || []
}
