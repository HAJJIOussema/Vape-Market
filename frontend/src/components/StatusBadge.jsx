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

function StatusBadge({ status }) {
  const value = statusLabels[status] ? status : 'pending'
  return (
    <span className={`status-badge status-${value}`}>
      <span className="status-dot" aria-hidden="true" />
      {statusLabels[status] || status || 'Inconnu'}
    </span>
  )
}

export default StatusBadge
