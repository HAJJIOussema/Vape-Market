import { apiRequest } from './api.js'
export const getProducts = (params = '') => apiRequest(`/products${params ? `?${params}` : ''}`)
export const getProduct = (id) => apiRequest(`/products/${id}`)
