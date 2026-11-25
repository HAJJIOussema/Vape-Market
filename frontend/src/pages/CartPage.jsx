import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import { MAX_ITEM_QUANTITY } from '../context/cartLimits.js'
import { createIdempotencyKey, createOrder } from '../services/orderService.js'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import { resolveImageUrl } from '../services/imageService.js'
import { normalizeTunisianPhone, TUNISIAN_GOVERNORATES } from '../utils/tunisia.js'
import { saveOrderConfirmation } from '../utils/orderConfirmation.js'

const EMPTY_FORM = { name: '', email: '', phone: '', governorate: '', city: '', address: '', postal_code: '' }

function CartPage() {
  const { items, updateItem, removeItem, clearCart, itemCount } = useCart()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // One idempotency key per distinct order attempt: a retry or double click
  // re-sends the same key (no duplicate order), any change gets a new one.
  const attempt = useRef({ signature: '', key: '' })
  const total = items.reduce((sum, item) => sum + Number(item.variant.price_tnd) * item.quantity, 0)

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

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submitOrder(event) {
    event.preventDefault()
    if (submitting) return
    setError('')

    const email = (user?.email || form.email).trim()
    const phone = normalizeTunisianPhone(form.phone)
    const postalCode = form.postal_code.trim()
    if (!phone) {
      setError('Le téléphone doit être un numéro tunisien à 8 chiffres (ex. 20 123 456).')
      return
    }
    if (postalCode && !/^\d{4}$/.test(postalCode)) {
      setError('Le code postal doit contenir 4 chiffres.')
      return
    }

    const order = {
      items: items.map((item) => ({ variant_id: item.variant_id, quantity: Number(item.quantity) })),
      customer_email: email,
      customer_phone: phone,
      shipping_address: {
        recipient_name: form.name.trim(),
        phone,
        governorate: form.governorate,
        city: form.city.trim(),
        address_line: form.address.trim(),
        ...(postalCode ? { postal_code: postalCode } : {}),
      },
    }
    const signature = JSON.stringify([user?.id || 'guest', order])
    if (attempt.current.signature !== signature) {
      attempt.current = { signature, key: createIdempotencyKey() }
    }

    setSubmitting(true)
    try {
      const response = await createOrder(order, attempt.current.key)
      const created = response?.data || response
      saveOrderConfirmation({
        // The RPC returns the order row only; show the lines from the cart.
        order: {
          ...created,
          order_items: created?.order_items || items.map((item) => ({
            id: item.variant_id,
            product_name_snapshot: item.product.name,
            variant_name_snapshot: item.variant.name,
            quantity: item.quantity,
            line_total_tnd: Number(item.variant.price_tnd) * item.quantity,
          })),
        },
        guestToken: created?.guest_access_token || null,
        isGuest: !user,
      })
      clearCart()
      navigate('/commande/confirmation', { replace: true })
    } catch (requestError) {
      if (requestError.status === 401) {
        setError('Votre session a expiré. Reconnectez-vous ou déconnectez-vous pour commander en tant qu’invité.')
      } else {
        setError(requestError.message || 'Impossible de créer la commande.')
      }
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
                  src={resolveImageUrl(item.image_path || item.product.image_paths?.[0])}
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
                      max={MAX_ITEM_QUANTITY}
                      value={item.quantity}
                      aria-label={`Quantité de ${item.product.name}`}
                      onChange={(event) => {
                        // An empty field while typing must not delete the line.
                        if (event.target.value === '') return
                        updateItem(item.variant_id, event.target.value)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => updateItem(item.variant_id, Number(item.quantity) + 1)}
                      disabled={Number(item.quantity) >= MAX_ITEM_QUANTITY}
                      aria-label="Augmenter la quantité"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="cart-item-total">
                  <span className="cart-item-label">Total</span>
                  <strong>{(Number(item.variant.price_tnd) * item.quantity).toFixed(3)} TND</strong>
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

          <form className="account-form order-form" onSubmit={submitOrder}>
            <h3>Informations de livraison</h3>
            {!authLoading && !user && (
              <p className="checkout-guest-note">
                Pas besoin de compte : commandez en tant qu’invité.{' '}
                <Link to="/login" state={{ from: '/cart' }}>Se connecter</Link> pour retrouver la commande dans votre espace.
              </p>
            )}
            <label>
              Nom complet
              <input
                required
                maxLength={160}
                autoComplete="name"
                placeholder="Votre nom"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
              />
            </label>
            {user ? (
              <p className="checkout-account-email">Commande liée au compte <strong>{user.email}</strong></p>
            ) : (
              <label>
                E-mail
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={form.email}
                  onChange={(event) => setField('email', event.target.value)}
                />
              </label>
            )}
            <label>
              Téléphone
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="20 123 456"
                value={form.phone}
                onChange={(event) => setField('phone', event.target.value)}
              />
            </label>
            <label>
              Gouvernorat
              <select
                required
                value={form.governorate}
                onChange={(event) => setField('governorate', event.target.value)}
              >
                <option value="" disabled>Choisir…</option>
                {TUNISIAN_GOVERNORATES.map((governorate) => (
                  <option key={governorate} value={governorate}>{governorate}</option>
                ))}
              </select>
            </label>
            <label>
              Ville
              <input
                required
                maxLength={100}
                autoComplete="address-level2"
                placeholder="Ville"
                value={form.city}
                onChange={(event) => setField('city', event.target.value)}
              />
            </label>
            <label>
              Adresse
              <input
                required
                maxLength={255}
                autoComplete="street-address"
                placeholder="Rue, numéro, étage…"
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
              />
            </label>
            <label>
              Code postal <span className="field-optional">(facultatif)</span>
              <input
                inputMode="numeric"
                maxLength={4}
                autoComplete="postal-code"
                placeholder="1000"
                value={form.postal_code}
                onChange={(event) => setField('postal_code', event.target.value)}
              />
            </label>
            <p className="checkout-payment-note">Paiement à la livraison (espèces).</p>
            {error && <p className="form-message is-error" role="alert">{error}</p>}
            <button className="button button-block" disabled={submitting || authLoading}>
              {submitting ? 'Envoi…' : 'Confirmer ma commande'}
            </button>
          </form>
        </aside>
      </div>
    </section>
  )
}

export default CartPage
