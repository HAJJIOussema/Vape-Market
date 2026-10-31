import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/useCart.js'
import { useAuth } from '../context/useAuth.js'
import { createOrder } from '../services/orderService.js'

function CartPage() {
  const { items, updateItem, removeItem, clearCart, itemCount } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const total = items.reduce((sum, item) => sum + item.variant.price_tnd * item.quantity, 0)

  // ── DEBUG : vider le panier (variants périmés d'un ancien seed) ──────────
  function purgeCart() {
    localStorage.removeItem('vape-market-cart')
    clearCart()
    console.warn('[CartPage] ⚠️  localStorage panier vidé. Ré-ajoutez vos produits depuis le catalogue.')
  }

  if (items.length === 0) {
    return (
      <section>
        <h1>Votre panier</h1>
        <p>Votre panier est vide.</p>
        <Link className="button" to="/products">Voir les produits</Link>
      </section>
    )
  }

  async function submitOrder(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    // ── DEBUG FRONTEND : inspection du panier avant envoi ────────────────
    const orderItems = items.map((item) => ({
      variant_id: item.variant_id,
      quantity: Number(item.quantity),
    }))

    console.group('[CartPage] submitOrder — payload envoyé à POST /api/v1/orders')
    console.log('user.id           :', user?.id)
    console.log('user.email        :', user?.email)
    console.log('nb articles       :', items.length)
    console.table(items.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
      product: item.product?.name,
      variant: item.variant?.name,
      price_tnd: item.variant?.price_tnd,
    })))
    console.log('localStorage raw  :', localStorage.getItem('vape-market-cart'))
    console.log('orderItems envoyés:', JSON.stringify(orderItems, null, 2))
    console.groupEnd()
    // ────────────────────────────────────────────────────────────────────

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
      console.error('[CartPage] Erreur commande :', requestError)
      setError(requestError.message || 'Impossible de créer la commande.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="section-heading">
        <h1>Votre panier</h1>
        <span>{itemCount} article(s)</span>
      </div>

      {/* ── DEBUG BADGE : vider le panier si variants périmés ── */}
      <button
        type="button"
        onClick={purgeCart}
        style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem', background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
      >
        🗑 Vider le panier (debug — ancien seed)
      </button>

      <div className="cart-list">
        {items.map((item) => (
          <article className="cart-item" key={item.variant_id}>
            <div>
              <h2>{item.product.name}</h2>
              <p>{item.variant.name} — {item.variant.price_tnd} TND</p>
              <small style={{ opacity: 0.5, fontSize: '0.7rem' }}>variant_id: {item.variant_id}</small>
            </div>
            <label>
              Quantité
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(event) => updateItem(item.variant_id, event.target.value)}
              />
            </label>
            <strong>{(item.variant.price_tnd * item.quantity).toFixed(3)} TND</strong>
            <button type="button" onClick={() => removeItem(item.variant_id)}>Supprimer</button>
          </article>
        ))}
      </div>
      <p className="cart-total">Total : <strong>{total.toFixed(3)} TND</strong></p>
      <Link className="button" to="/products">Continuer mes achats</Link>
      {user ? (
        <form className="account-form order-form" onSubmit={submitOrder}>
          <h2>Confirmer ma commande</h2>
          <label>Nom<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Téléphone<input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Adresse<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          {error && <p role="alert">{error}</p>}
          <button className="button" disabled={submitting}>{submitting ? 'Création...' : 'Confirmer ma commande'}</button>
        </form>
      ) : (
        <p>Connectez-vous pour confirmer votre commande. <Link to="/login">Se connecter</Link></p>
      )}
    </section>
  )
}

export default CartPage
