const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
  refunded: 'Remboursée',
}

/** Human-readable (French) label for an order status. */
export function statusLabel(status) {
  return statusLabels[status] || status || 'Inconnu'
}

function StatusBadge({ status }) {
  const value = statusLabels[status] ? status : 'pending'
  return (
    <span className={`status-badge status-${value}`}>
      <span className="status-dot" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  )
}

export default StatusBadge
