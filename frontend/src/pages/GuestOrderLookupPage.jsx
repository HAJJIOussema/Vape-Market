import { useState } from 'react'
import OrderSummary from '../components/OrderSummary.jsx'
import { lookupGuestOrder } from '../services/orderService.js'

function GuestOrderLookupPage() {
  const [form, setForm] = useState({ orderNumber: '', token: '' })
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const response = await lookupGuestOrder(form.orderNumber.trim().toUpperCase(), form.token.trim())
      setOrder(response?.data || response)
    } catch (requestError) {
      setError(requestError.status === 404
        ? 'Aucune commande ne correspond à ce numéro et ce code.'
        : requestError.message || 'Impossible de retrouver la commande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="guest-lookup-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Commande invitée</span>
          <h1>Suivre ma commande</h1>
          <p>Saisissez le numéro de commande et le code de suivi affichés après votre achat.</p>
        </div>
      </div>

      <form className="account-form guest-lookup-form" onSubmit={submit}>
        <label>
          Numéro de commande
          <input
            required
            placeholder="VM-XXXXXXXXXXXX"
            autoComplete="off"
            value={form.orderNumber}
            onChange={(event) => setForm({ ...form, orderNumber: event.target.value })}
          />
        </label>
        <label>
          Code de suivi
          <input
            required
            autoComplete="off"
            spellCheck={false}
            value={form.token}
            onChange={(event) => setForm({ ...form, token: event.target.value })}
          />
        </label>
        {error && <p className="form-message is-error" role="alert">{error}</p>}
        <button className="button" disabled={loading}>{loading ? 'Recherche…' : 'Rechercher'}</button>
      </form>

      {order && <OrderSummary order={order} />}
    </section>
  )
}

export default GuestOrderLookupPage
