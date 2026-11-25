import { createContext, useCallback, useMemo, useState } from 'react'
import { getDisplayImagePath } from '../utils/productImages.js'
import { MAX_CART_LINES, MAX_ITEM_QUANTITY } from './cartLimits.js'

const STORAGE_KEY = 'vape-market-cart'
const CartContext = createContext(null)

function clampQuantity(value) {
  const quantity = Math.trunc(Number(value))
  if (!Number.isFinite(quantity) || quantity < 1) return 0
  return Math.min(quantity, MAX_ITEM_QUANTITY)
}

function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) return []
    return stored
      .filter((item) => item && item.variant_id && item.product && item.variant)
      .map((item) => ({ ...item, quantity: clampQuantity(item.quantity) || 1 }))
  } catch {
    return []
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage can be unavailable (private mode, quota): keep the in-memory cart.
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart)

  const update = useCallback((transform) => {
    setItems((current) => {
      const next = transform(current)
      writeCart(next)
      return next
    })
  }, [])

  const addItem = useCallback((product, variant = product.variants?.[0], imagePath) => {
    if (!variant) return
    update((current) => {
      const existing = current.find((item) => item.variant_id === variant.id)
      if (existing) {
        return current.map((item) => item.variant_id === variant.id
          ? { ...item, quantity: clampQuantity(item.quantity + 1) }
          : item)
      }
      if (current.length >= MAX_CART_LINES) return current
      return [...current, {
        variant_id: variant.id,
        quantity: 1,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brands || product.brand,
        },
        variant: {
          id: variant.id,
          name: variant.name,
          price_tnd: Number(variant.price_tnd),
        },
        // The image of the chosen flavour, not the generic product image.
        image_path: imagePath || getDisplayImagePath(product, variant),
      }]
    })
  }, [update])

  const removeItem = useCallback((variantId) => {
    update((current) => current.filter((item) => item.variant_id !== variantId))
  }, [update])

  const updateItem = useCallback((variantId, quantity) => {
    const nextQuantity = clampQuantity(quantity)
    update((current) => (nextQuantity
      ? current.map((item) => item.variant_id === variantId ? { ...item, quantity: nextQuantity } : item)
      : current.filter((item) => item.variant_id !== variantId)))
  }, [update])

  const clearCart = useCallback(() => update(() => []), [update])

  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    addItem,
    updateItem,
    removeItem,
    clearCart,
  }), [items, addItem, updateItem, removeItem, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export { CartContext }
