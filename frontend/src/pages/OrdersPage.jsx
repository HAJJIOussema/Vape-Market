import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { getOrders } from '../services/accountService.js'

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    getOrders()
      .then((response) => {
        setOrders(response.data || response || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        setError(requestError.message || 'Impossible de charger vos commandes.')
        setStatus('error')
      })
  }, [])

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
                <strong>{order.total_tnd} TND</strong>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  )
}

export default OrdersPage
