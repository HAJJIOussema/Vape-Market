import { apiRequest } from './api.js'
export const getProducts = (params = '') => apiRequest(`/products${params ? `?${params}` : ''}`)
export const getProduct = (id) => apiRequest(`/products/${id}`)
export const getProductBySlug = async (slug) => {
  try {
    return await apiRequest(`/products/slug/${encodeURIComponent(slug)}`)
  } catch (error) {
    if (!error.message.includes('404')) throw error
    const response = await getProducts('page_size=100')
    const products = response.data || response
    const product = products.find((item) => item.slug === slug)
    if (!product) throw error
    return { data: product }
  }
}
