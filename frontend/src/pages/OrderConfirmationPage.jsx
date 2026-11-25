import { useState } from 'react'
import { Link } from 'react-router-dom'
import OrderSummary from '../components/OrderSummary.jsx'
import { readOrderConfirmation } from '../utils/orderConfirmation.js'

function OrderConfirmationPage() {
  const [confirmation] = useState(readOrderConfirmation)
  const [copied, setCopied] = useState(false)

  if (!confirmation) {
    return (
      <section className="empty-state">
        <span className="empty-state-icon" aria-hidden="true">◈</span>
        <h1>Aucune commande récente</h1>
        <p>Vous pouvez suivre une commande invitée avec son numéro et son code de suivi.</p>
        <Link className="button" to="/suivi-commande">Suivre une commande</Link>
      </section>
    )
  }

  const { order, guestToken, isGuest } = confirmation

  async function copyTrackingCode() {
    try {
      await navigator.clipboard.writeText(`${order.order_number} ${guestToken}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="order-confirmation-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Merci !</span>
          <h1>Commande enregistrée</h1>
          <p>Nous vous contacterons par téléphone pour confirmer la livraison. Paiement à la livraison.</p>
        </div>
      </div>

      <OrderSummary order={order} />

      {isGuest && guestToken && (
        <div className="guest-tracking-card">
          <h2>Votre code de suivi</h2>
          <p>
            Conservez ce code : il permet de consulter votre commande sans compte.
            Il ne sera plus affiché ensuite.
          </p>
          <code className="guest-tracking-code">{guestToken}</code>
          <div className="guest-tracking-actions">
            <button className="button button-secondary" type="button" onClick={copyTrackingCode}>
              {copied ? 'Copié ✓' : 'Copier le numéro et le code'}
            </button>
            <Link className="text-link" to="/suivi-commande">Suivre ma commande</Link>
          </div>
        </div>
      )}

      <div className="hero-actions">
        {isGuest ? (
          <Link className="button" to="/register">Créer un compte</Link>
        ) : (
          <Link className="button" to="/account/orders">Voir mes commandes</Link>
        )}
        <Link className="button button-secondary" to="/products">Continuer mes achats</Link>
      </div>
    </section>
  )
}

export default OrderConfirmationPage
