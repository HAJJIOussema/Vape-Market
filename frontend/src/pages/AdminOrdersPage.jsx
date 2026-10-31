import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { cancelAdminOrder, confirmAdminOrder, getAdminOrders } from '../services/orderService.js'

const statusLabels = {
  pending: '🟠 En attente',
  confirmed: '🟢 Confirmée',
  cancelled: '🔴 Annulée',
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  function loadOrders() {
    setStatus('loading')
    return getAdminOrders()
      .then((response) => {
        setOrders(response.data || response || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        setError(requestError.message || 'Impossible de charger les commandes.')
        setStatus('error')
      })
  }

  useEffect(() => {
    getAdminOrders()
      .then((response) => {
        setOrders(response.data || response || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        setError(requestError.message || 'Impossible de charger les commandes.')
        setStatus('error')
      })
  }, [])

  async function changeStatus(action, orderId) {
    setError('')
    try {
      await action(orderId)
      await loadOrders()
    } catch (requestError) {
      setError(requestError.message || 'Impossible de modifier la commande.')
    }
  }

  if (status === 'loading') return <LoadingSpinner />
  if (status === 'error') return <p role="alert">{error}</p>

  return (
    <section>
      <h1>Admin → Commandes</h1>
      {error && <p role="alert">{error}</p>}
      {orders.length === 0 ? <p>Aucune commande.</p> : (
        <div className="admin-order-list">
          {orders.map((order) => {
            const address = order.shipping_address_snapshot || {}
            return (
              <article className="order-card admin-order-card" key={order.id}>
                <div>
                  <strong>{order.order_number}</strong>
                  <p>{address.recipient_name || 'Client inconnu'} — {order.customer_phone}</p>
                  <p>{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <strong>{Number(order.total_tnd).toFixed(3)} TND</strong>
                <span>{statusLabels[order.status] || order.status}</span>
                {order.status === 'pending' && (
                  <div className="order-actions">
                    <button type="button" onClick={() => changeStatus(confirmAdminOrder, order.id)}>Confirmer</button>
                    <button type="button" onClick={() => changeStatus(cancelAdminOrder, order.id)}>Annuler</button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default AdminOrdersPage
