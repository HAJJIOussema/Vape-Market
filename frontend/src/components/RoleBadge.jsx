const roleLabels = {
  customer: 'customer',
  stock_manager: 'stock_manager',
  admin: 'admin',
  super_admin: 'super_admin',
}

function RoleBadge({ role }) {
  const value = roleLabels[role] ? role : 'customer'
  return (
    <span className={`role-badge role-${value}`}>
      <span className="role-dot" aria-hidden="true" />
      {roleLabels[value]}
    </span>
  )
}

export default RoleBadge
