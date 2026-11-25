// The confirmation (including a guest's one-time tracking code) is kept in
// sessionStorage so a page refresh does not lose it. It is never sent anywhere.
const STORAGE_KEY = 'vape-market-last-order'

export function saveOrderConfirmation(confirmation) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(confirmation))
  } catch {
    // Storage unavailable: the confirmation page shows a generic message.
  }
}

export function readOrderConfirmation() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    return value?.order ? value : null
  } catch {
    return null
  }
}
