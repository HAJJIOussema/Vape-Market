import { apiRequest } from './api.js'

function unwrap(payload) {
  return payload?.data ?? payload
}

async function wait(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function getProfile() {
  const delays = [0, 300, 700]
  let lastError

  for (const delay of delays) {
    if (delay) await wait(delay)
    try {
      return unwrap(await apiRequest('/profile'))
    } catch (error) {
      lastError = error
      if (error.status !== 404) throw error
    }
  }

  throw lastError
}

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
