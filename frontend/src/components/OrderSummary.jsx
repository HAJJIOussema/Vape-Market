import StatusBadge from './StatusBadge.jsx'

function formatTnd(value) {
  return `${Number(value || 0).toFixed(3)} TND`
}

/** Read-only summary of an order returned by the API. */
function OrderSummary({ order }) {
  const address = order.shipping_address_snapshot || {}
  const items = order.order_items || []

  return (
    <div className="order-summary">
      <div className="order-summary-head">
        <div>
          <span className="order-summary-label">Commande</span>
          <strong>{order.order_number}</strong>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {items.length > 0 && (
        <ul className="order-summary-items">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.product_name_snapshot} — {item.variant_name_snapshot} × {item.quantity}</span>
              <strong>{formatTnd(item.line_total_tnd)}</strong>
            </li>
          ))}
        </ul>
      )}

      <div className="summary-row">
        <span>Sous-total</span>
        <span>{formatTnd(order.subtotal_tnd)}</span>
      </div>
      <div className="summary-row">
        <span>Livraison</span>
        <span>{Number(order.shipping_cost_tnd) ? formatTnd(order.shipping_cost_tnd) : 'Offerte'}</span>
      </div>
      <div className="summary-total">
        <span>Total à payer à la livraison</span>
        <strong>{formatTnd(order.total_tnd)}</strong>
      </div>

      {address.address_line && (
        <p className="order-summary-address">
          Livraison : {address.recipient_name}, {address.address_line}
          {address.city ? `, ${address.city}` : ''}
          {address.governorate ? `, ${address.governorate}` : ''}
          {address.postal_code ? ` ${address.postal_code}` : ''}
        </p>
      )}
    </div>
  )
}

export default OrderSummary
