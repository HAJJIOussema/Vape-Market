import { apiRequest } from './api.js'

export const getCategories = () => apiRequest('/categories')
