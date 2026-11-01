import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import { createOrder } from '../services/orderService.js'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import { resolveImageUrl } from '../services/imageService.js'

function CartPage() {
  const { items, updateItem, removeItem, clearCart, itemCount } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const total = items.reduce((sum, item) => sum + item.variant.price_tnd * item.quantity, 0)

  if (items.length === 0) {
    return (
      <section className="empty-state">
        <span className="empty-state-icon" aria-hidden="true">◈</span>
        <h1>Votre panier est vide</h1>
        <p>Ajoutez vos produits préférés pour commencer votre commande.</p>
        <Link className="button" to="/products">Voir les produits</Link>
      </section>
    )
  }

  async function submitOrder(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const orderItems = items.map((item) => ({
      variant_id: item.variant_id,
      quantity: Number(item.quantity),
    }))

    try {
      await createOrder({
        items: orderItems,
        customer_email: user.email,
        customer_phone: form.phone.trim(),
        shipping_address: {
          recipient_name: form.name,
          phone: form.phone.trim(),
          address_line: form.address,
        },
        shipping_cost_tnd: 0,
      }, crypto.randomUUID())
      clearCart()
      navigate('/account/orders')
    } catch (requestError) {
      setError(requestError.message || 'Impossible de créer la commande.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="cart-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Votre sélection</span>
          <h1>Panier</h1>
          <p>{itemCount} article{itemCount > 1 ? 's' : ''} dans votre panier.</p>
        </div>
        <Link className="text-link" to="/products">
          Continuer mes achats
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className="cart-layout">
        <div className="cart-list">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.article
                className="cart-item"
                key={item.variant_id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <ImageWithFallback
                  className="cart-item-image"
                  src={resolveImageUrl(item.product.image_paths?.[0])}
                  alt={item.product.name}
                  fallbackClassName="cart-item-image cart-item-image-fallback"
                  fallbackLabel={`Image de ${item.product.name}`}
                />
                <div className="cart-item-main">
                  <span className="product-brand">{item.product.brand?.name || 'VAPE MARKET'}</span>
                  <h2>{item.product.name}</h2>
                  <p>{item.variant.name}</p>
                  <button className="cart-item-remove" type="button" onClick={() => removeItem(item.variant_id)}>
                    Retirer
                  </button>
                </div>
                <div className="cart-item-quantity">
                  <span className="cart-item-label">Quantité</span>
                  <div className="quantity-control">
                    <button
                      type="button"
                      onClick={() => updateItem(item.variant_id, Math.max(1, Number(item.quantity) - 1))}
                      disabled={Number(item.quantity) <= 1}
                      aria-label="Diminuer la quantité"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      aria-label={`Quantité de ${item.product.name}`}
                      onChange={(event) => updateItem(item.variant_id, event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => updateItem(item.variant_id, Number(item.quantity) + 1)}
                      aria-label="Augmenter la quantité"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="cart-item-total">
                  <span className="cart-item-label">Total</span>
                  <strong>{(item.variant.price_tnd * item.quantity).toFixed(3)} TND</strong>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        <aside className="cart-summary">
          <h2>Récapitulatif</h2>
          <div className="summary-row">
            <span>Sous-total</span>
            <span>{total.toFixed(3)} TND</span>
          </div>
          <div className="summary-row">
            <span>Livraison</span>
            <span className="summary-free">Offerte</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{total.toFixed(3)} TND</strong>
          </div>

          {user ? (
            <form className="account-form order-form" onSubmit={submitOrder}>
              <h3>Informations de livraison</h3>
              <label>
                Nom complet
                <input
                  required
                  autoComplete="name"
                  placeholder="Votre nom"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                Téléphone
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="+216 …"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
              <label>
                Adresse
                <input
                  required
                  autoComplete="street-address"
                  placeholder="Adresse de livraison"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </label>
              {error && <p className="form-message is-error" role="alert">{error}</p>}
              <button className="button button-block" disabled={submitting}>
                {submitting ? 'Création…' : 'Confirmer ma commande'}
              </button>
            </form>
          ) : (
            <div className="cart-login">
              <p>Connectez-vous pour finaliser votre commande.</p>
              <Link className="button button-block" to="/login">Se connecter</Link>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

export default CartPage
