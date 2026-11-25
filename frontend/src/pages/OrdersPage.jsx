import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import OrderSummary from '../components/OrderSummary.jsx'
import StatusBadge, { statusLabel } from '../components/StatusBadge.jsx'
import { getOrders } from '../services/accountService.js'

const ORDER_REFRESH_MS = 15000

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)
  const [updates, setUpdates] = useState([])
  const knownStatuses = useRef(null)
  const reduceMotion = useReducedMotion()

  // Load the orders, and on later refreshes report the ones whose status changed.
  const refresh = useCallback(async (firstLoad = false) => {
    try {
      const response = await getOrders()
      const rows = response.data || response || []
      const previous = knownStatuses.current
      if (previous) {
        const changed = rows.filter((order) => previous.has(order.id) && previous.get(order.id) !== order.status)
        if (changed.length) {
          setUpdates(changed.map((order) => `Commande ${order.order_number} : ${statusLabel(order.status)}`))
        }
      }
      knownStatuses.current = new Map(rows.map((order) => [order.id, order.status]))
      setOrders(rows)
      setStatus('ready')
    } catch (requestError) {
      // A failed background refresh keeps the list already shown.
      if (firstLoad) {
        setError(requestError.message || 'Impossible de charger vos commandes.')
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    refresh(true)
    // Status changes made by the shop appear without reloading the page.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, ORDER_REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  if (status === 'loading') return <LoadingSpinner />
  if (status === 'error') return <p className="notice notice-error" role="alert">{error}</p>

  return (
    <section className="orders-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Historique</span>
          <h1>Mes commandes</h1>
          <p>Retrouvez vos commandes et suivez leur statut en un coup d’œil.</p>
        </div>
        <Link className="text-link" to="/products">
          Découvrir les produits
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {updates.length > 0 && (
        <div className="notice order-updates" role="status" aria-live="polite">
          <strong>Statut mis à jour</strong>
          <ul>{updates.map((text) => <li key={text}>{text}</li>)}</ul>
          <button type="button" className="text-link" onClick={() => setUpdates([])}>OK</button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">◈</span>
          <h2>Aucune commande pour le moment</h2>
          <p>Votre première commande apparaîtra ici.</p>
          <Link className="button" to="/products">Explorer la boutique</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order, index) => (
            <motion.article
              className="order-card"
              key={order.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.25), ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="order-card-reference">
                <span>Commande</span>
                <strong>{order.order_number}</strong>
              </div>
              <div className="order-card-date">
                <span>Date</span>
                <strong>{new Date(order.created_at).toLocaleDateString('fr-FR')}</strong>
              </div>
              <div className="order-card-status">
                <StatusBadge status={order.status} />
              </div>
              <div className="order-card-total">
                <span>Total</span>
                <strong>{Number(order.total_tnd).toFixed(3)} TND</strong>
              </div>
              <button
                type="button"
                className="text-link order-card-toggle"
                aria-expanded={openId === order.id}
                onClick={() => setOpenId(openId === order.id ? null : order.id)}
              >
                {openId === order.id ? 'Masquer le détail' : 'Voir le détail'}
              </button>
              {openId === order.id && (
                <div className="order-card-details">
                  <OrderSummary order={order} />
                </div>
              )}
            </motion.article>
          ))}
        </div>
      )}
    </section>
  )
}

export default OrdersPage
