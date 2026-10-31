import { createContext, useState } from 'react'

const STORAGE_KEY = 'vape-market-cart'
const CartContext = createContext(null)

function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart)

  function persist(nextItems) {
    setItems(nextItems)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems))
  }

  function addItem(product, variant = product.variants?.[0]) {
    if (!variant) return
    const existing = items.find((item) => item.variant_id === variant.id)
    const nextItems = existing
      ? items.map((item) => item.variant_id === variant.id
        ? { ...item, quantity: item.quantity + 1 }
        : item)
      : [...items, {
        variant_id: variant.id,
        quantity: 1,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image_paths: product.image_paths,
          brand: product.brands || product.brand,
        },
        variant: {
          id: variant.id,
          name: variant.name,
          price_tnd: variant.price_tnd,
        },
      }]
    persist(nextItems)
  }

  function updateItem(variantId, quantity) {
    const nextQuantity = Number(quantity)
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      removeItem(variantId)
      return
    }
    persist(items.map((item) => item.variant_id === variantId
      ? { ...item, quantity: nextQuantity }
      : item))
  }

  function removeItem(variantId) {
    persist(items.filter((item) => item.variant_id !== variantId))
  }

  function clearCart() {
    persist([])
  }

  const value = {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    addItem,
    updateItem,
    removeItem,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export { CartContext }
