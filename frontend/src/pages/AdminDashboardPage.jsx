import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import {
  adjustInventory, createAdminProduct, deleteAdminProduct, getAdminBrands,
  getAdminCategories, getAdminInventory, getAdminOrders, getAdminProducts,
  getAdminUsers, getInventoryMovements, updateAdminProduct,
} from '../services/adminService.js'
import { confirmAdminOrder, cancelAdminOrder } from '../services/orderService.js'

const statusLabels = { pending: '🟠 pending', confirmed: '🟢 confirmed', cancelled: '🔴 cancelled' }
const sections = [
  ['dashboard', 'Dashboard'],
  ['products', 'Produits'],
  ['categories', 'Catégories'],
  ['brands', 'Marques'],
  ['stock', 'Stock'],
  ['orders', 'Commandes'],
  ['users', 'Utilisateurs'],
]

function dataOf(response) {
  return response?.data || response || []
}

function AdminDashboardPage() {
  const { section = 'dashboard' } = useParams()
  const navigate = useNavigate()
  const currentSection = sections.some(([key]) => key === section) ? section : 'dashboard'
  const [data, setData] = useState({})
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const loadSection = useCallback((showLoading = true) => {
    if (showLoading) setStatus('loading')
    setError('')
    const loaders = {
      dashboard: () => Promise.all([getAdminProducts(), getAdminCategories(), getAdminBrands(), getAdminOrders()]),
      products: getAdminProducts,
      categories: getAdminCategories,
      brands: getAdminBrands,
      stock: () => Promise.all([getAdminInventory(), getInventoryMovements()]),
      orders: getAdminOrders,
      users: getAdminUsers,
    }
    return loaders[currentSection]()
      .then((response) => {
        if (currentSection === 'dashboard') {
          setData({ products: dataOf(response[0]), categories: dataOf(response[1]), brands: dataOf(response[2]), orders: dataOf(response[3]) })
        } else if (currentSection === 'stock') {
          setData({ inventory: dataOf(response[0]), movements: dataOf(response[1]) })
        } else {
          setData({ [currentSection]: dataOf(response) })
        }
        setStatus('ready')
      })
      .catch((requestError) => {
        setError(requestError.message || 'Impossible de charger cette section.')
        setStatus('error')
      })
  }, [currentSection])

  useEffect(() => {
    loadSection(false)
  }, [loadSection])

  function navigateSection(nextSection) {
    navigate(nextSection === 'dashboard' ? '/admin' : `/admin/${nextSection}`)
  }

  return (
    <section className="admin-layout">
      <aside className="admin-sidebar">
        <h1>Administration</h1>
        <nav aria-label="Navigation administration">
          {sections.map(([key, label]) => (
            <Link className={currentSection === key ? 'admin-nav-active' : ''} key={key} to={key === 'dashboard' ? '/admin' : `/admin/${key}`}>
              {label}
            </Link>
          ))}
        </nav>
        <Link to="/">Retour à la boutique</Link>
      </aside>
      <div className="admin-content">
        {status === 'loading' && <LoadingSpinner />}
        {status === 'error' && <p role="alert">{error}</p>}
        {status === 'ready' && (
          <>
            {currentSection === 'dashboard' && <DashboardSection data={data} onNavigate={navigateSection} />}
            {currentSection === 'products' && <ProductsSection products={data.products} onReload={loadSection} />}
            {currentSection === 'categories' && <SimpleList title="Catégories" items={data.categories} />}
            {currentSection === 'brands' && <SimpleList title="Marques" items={data.brands} />}
            {currentSection === 'stock' && <StockSection data={data} onReload={loadSection} />}
            {currentSection === 'orders' && <OrdersSection orders={data.orders} onReload={loadSection} />}
            {currentSection === 'users' && <UsersSection users={data.users} />}
          </>
        )}
      </div>
    </section>
  )
}

function DashboardSection({ data, onNavigate }) {
  const orders = data.orders || []
  const metrics = [
    ['Produits', data.products?.length || 0, 'products'],
    ['Catégories', data.categories?.length || 0, 'categories'],
    ['Marques', data.brands?.length || 0, 'brands'],
    ['Clients', '—', 'users'],
    ['En attente', orders.filter((order) => order.status === 'pending').length, 'orders'],
    ['Confirmées', orders.filter((order) => order.status === 'confirmed').length, 'orders'],
    ['Annulées', orders.filter((order) => order.status === 'cancelled').length, 'orders'],
  ]
  return <><h2>Dashboard</h2><div className="admin-metrics">{metrics.map(([label, value, target]) => <button key={label} type="button" onClick={() => onNavigate(target)}><strong>{value}</strong><span>{label}</span></button>)}</div><OrdersTable orders={orders.slice(0, 5)} /></>
}

function ProductsSection({ products = [], onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault()
    try {
      if (editing) await updateAdminProduct(editing.id, form)
      else await createAdminProduct(form)
      setEditing(null)
      setForm({ name: '', slug: '', description: '' })
      onReload()
    } catch (requestError) {
      setError(requestError.message || 'Impossible d’enregistrer le produit.')
    }
  }
  async function remove(id) {
    if (!window.confirm('Supprimer ce produit ?')) return
    try { await deleteAdminProduct(id); onReload() } catch (requestError) { setError(requestError.message) }
  }
  return <><h2>Produits</h2><form className="admin-form" onSubmit={save}><input required placeholder="Nom" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input required placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /><textarea placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><button className="button">{editing ? 'Modifier' : 'Créer'}</button>{error && <p role="alert">{error}</p>}</form><div className="admin-table">{products.map((product) => <div className="admin-row" key={product.id}><span>{product.name}</span><span>{product.slug}</span><div><button type="button" onClick={() => { setEditing(product); setForm({ name: product.name, slug: product.slug, description: product.description || '' }) }}>Modifier</button><button type="button" onClick={() => remove(product.id)}>Supprimer</button></div></div>)}</div></>
}

function SimpleList({ title, items = [] }) {
  return <><h2>{title}</h2><div className="admin-table">{items.map((item) => <div className="admin-row" key={item.id}><strong>{item.name}</strong><span>{item.slug}</span><span>{item.is_active === false ? 'Inactif' : 'Actif'}</span></div>)}</div></>
}

function StockSection({ data, onReload }) {
  const [error, setError] = useState('')
  async function adjust(item) {
    const delta = Number(window.prompt('Variation de stock (+ ou -)', '1'))
    if (!Number.isInteger(delta) || delta === 0) return
    try { await adjustInventory(item.variant_id, { delta, reason: 'Ajustement depuis le dashboard administrateur' }); onReload() } catch (requestError) { setError(requestError.message) }
  }
  return <><h2>Stock</h2>{error && <p role="alert">{error}</p>}<div className="admin-table">{(data.inventory || []).map((item) => <div className="admin-row" key={item.variant_id}><span>{item.product_variants?.name || item.variant_id}</span><span>{item.on_hand} disponibles</span><span>{item.reserved} réservés</span><button type="button" onClick={() => adjust(item)}>Ajuster</button></div>)}</div><h3>Historique</h3><div className="admin-table">{(data.movements || []).map((movement) => <div className="admin-row" key={movement.id}><span>{movement.movement_type}</span><span>{movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}</span><span>{new Date(movement.created_at).toLocaleString('fr-FR')}</span></div>)}</div></>
}

function OrdersSection({ orders = [], onReload }) {
  async function change(action, id) { await action(id); onReload() }
  return <><h2>Commandes</h2><OrdersTable orders={orders} onConfirm={(id) => change(confirmAdminOrder, id)} onCancel={(id) => change(cancelAdminOrder, id)} /></>
}

function OrdersTable({ orders = [], onConfirm, onCancel }) {
  return <div className="admin-table"><div className="admin-row admin-row-head"><span>Numéro / date</span><span>Client / téléphone</span><span>Montant</span><span>Statut / actions</span></div>{orders.map((order) => <div className="admin-row" key={order.id}><span><strong>{order.order_number}</strong><small>{new Date(order.created_at).toLocaleDateString('fr-FR')}</small></span><span>{order.shipping_address_snapshot?.recipient_name || order.customer_email}<small>{order.customer_phone}</small></span><span>{Number(order.total_tnd).toFixed(3)} TND</span><span>{statusLabels[order.status] || order.status}{order.status === 'pending' && onConfirm && <><button type="button" onClick={() => onConfirm(order.id)}>Confirmer</button><button type="button" onClick={() => onCancel(order.id)}>Annuler</button></>}</span></div>)}</div>
}

function UsersSection({ users = [] }) {
  return <><h2>Utilisateurs</h2><div className="admin-table">{users.map((user) => <div className="admin-row" key={user.id}><strong>{user.full_name || user.email}</strong><span>{user.email}</span><span>{user.role}</span></div>)}</div></>
}

export default AdminDashboardPage
