import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getOrders } from '../services/accountService.js'

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

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
  if (status === 'error') return <p role="alert">{error}</p>

  return (
    <section>
      <h1>Mes commandes</h1>
      {orders.length === 0 ? <p>Aucune commande pour le moment.</p> : orders.map((order) => (
        <article className="order-card" key={order.id}>
          <div><strong>{order.order_number}</strong><p>{new Date(order.created_at).toLocaleDateString('fr-FR')}</p></div>
          <span>{order.status}</span>
          <strong>{order.total_tnd} TND</strong>
        </article>
      ))}
      <Link to="/products">Découvrir les produits</Link>
    </section>
  )
}

export default OrdersPage
