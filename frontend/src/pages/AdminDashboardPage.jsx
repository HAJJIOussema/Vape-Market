import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import ProductEditor from '../components/admin/ProductEditor.jsx'
import { getProductImagePath } from '../utils/productImages.js'
import {
  adjustInventory, createAdminBrand, createAdminCategory, deleteAdminBrand,
  deleteAdminCategory, deleteAdminProduct, getAdminBrands, getAdminCategories,
  getAdminInventory, getAdminOrders, getAdminProducts, getAdminUser, getAdminUsers,
  getInventoryMovements, updateAdminBrand, updateAdminCategory, updateAdminProduct,
} from '../services/adminService.js'
import { resolveImageUrl } from '../services/imageService.js'
import { confirmAdminOrder, cancelAdminOrder } from '../services/orderService.js'

const emptyCatalogForm = { name: '', slug: '', image_path: '' }
const adminIcons = {
  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  brands: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 14.7 9l6 .9-4.3 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9L12 3.5Z" />
    </svg>
  ),
  stock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8 12 4l8 4v8l-8 4-8-4V8Z" />
      <path d="m4 8 8 4 8-4M12 12v8" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 5.8M17.5 15.2A4.5 4.5 0 0 1 21 20" />
    </svg>
  ),
}
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
  const reduceMotion = useReducedMotion()
  const currentSection = sections.some(([key]) => key === section) ? section : 'dashboard'
  const [data, setData] = useState({})
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [unreadOrders, setUnreadOrders] = useState(0)
  const seenOrderIdsRef = useRef(new Set())
  const hasBaselineRef = useRef(false)
  const audioContextRef = useRef(null)

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

  // Refresh a section's data without the loading spinner: showing the spinner
  // unmounts the section and loses its local state (e.g. the product being edited).
  const reloadSection = useCallback(() => loadSection(false), [loadSection])

  function navigateSection(nextSection) {
    navigate(nextSection === 'dashboard' ? '/admin' : `/admin/${nextSection}`)
  }

  function playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context
      const now = context.currentTime
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
      gain.connect(context.destination)

      const first = context.createOscillator()
      first.type = 'sine'
      first.frequency.setValueAtTime(880, now)
      first.connect(gain)
      first.start(now)
      first.stop(now + 0.16)

      const second = context.createOscillator()
      second.type = 'sine'
      second.frequency.setValueAtTime(1174.66, now + 0.1)
      second.connect(gain)
      second.start(now + 0.1)
      second.stop(now + 0.36)
    } catch {
      // Ignore browser autoplay restrictions.
    }
  }

  const checkNewOrders = useCallback(async () => {
    try {
      const response = await getAdminOrders()
      const orders = dataOf(response)
      if (!hasBaselineRef.current) {
        seenOrderIdsRef.current = new Set(orders.map((order) => order.id))
        hasBaselineRef.current = true
        return
      }

      const newOrders = orders.filter((order) => !seenOrderIdsRef.current.has(order.id))
      if (newOrders.length === 0) return

      newOrders.forEach((order) => seenOrderIdsRef.current.add(order.id))
      setUnreadOrders((count) => count + newOrders.length)
      setToast({
        message: newOrders.length > 1
          ? `${newOrders.length} nouvelles commandes reçues.`
          : 'Nouvelle commande reçue.',
      })
      playNotificationSound()
      if (currentSection === 'orders' || currentSection === 'dashboard') {
        setData((previous) => ({ ...previous, orders }))
      }
      window.setTimeout(() => setToast(null), 4200)
    } catch {
      // Keep polling resilient.
    }
  }, [currentSection])

  useEffect(() => {
    checkNewOrders()
    const intervalId = window.setInterval(checkNewOrders, 30000)
    return () => window.clearInterval(intervalId)
  }, [checkNewOrders])

  useEffect(() => {
    if (currentSection === 'orders') setUnreadOrders(0)
  }, [currentSection])

  return (
    <section className="admin-layout">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" to="/">
          <BrandLogo showWordmark={false} />
          <span>
            <strong>VAPE MARKET</strong>
            <small>Administration</small>
          </span>
        </Link>
        <nav aria-label="Navigation administration">
          <span className="admin-nav-label">Gestion</span>
          {sections.map(([key, label]) => (
            <Link
              className={`admin-nav-link${currentSection === key ? ' admin-nav-active' : ''}`}
              key={key}
              to={key === 'dashboard' ? '/admin' : `/admin/${key}`}
            >
              <span className="admin-nav-icon">{adminIcons[key]}</span>
              {label}
              {key === 'orders' && unreadOrders > 0 && (
                <span className="admin-nav-badge">{unreadOrders > 9 ? '9+' : unreadOrders}</span>
              )}
            </Link>
          ))}
        </nav>
        <Link className="admin-back-link" to="/">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Retour à la boutique
        </Link>
      </aside>
      <div className="admin-content">
        {status === 'loading' && <LoadingSpinner />}
        {status === 'error' && <p className="notice notice-error" role="alert">{error}</p>}
        {status === 'ready' && (
          <motion.div
            key={currentSection}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentSection === 'dashboard' && <DashboardSection data={data} onNavigate={navigateSection} />}
            {currentSection === 'products' && <ProductsSection products={data.products} onReload={reloadSection} />}
            {currentSection === 'categories' && (
              <CatalogSection
                title="Catégories"
                itemLabel="catégorie"
                items={data.categories}
                emptyMessage="Aucune catégorie enregistrée."
                imagePlaceholder="demo/categories/liquides.jpg"
                createItem={createAdminCategory}
                updateItem={updateAdminCategory}
                deleteItem={deleteAdminCategory}
                onReload={reloadSection}
              />
            )}
            {currentSection === 'brands' && (
              <CatalogSection
                title="Marques"
                itemLabel="marque"
                items={data.brands}
                emptyMessage="Aucune marque enregistrée."
                imagePlaceholder="demo/brands/logo.png"
                createItem={createAdminBrand}
                updateItem={updateAdminBrand}
                deleteItem={deleteAdminBrand}
                onReload={reloadSection}
              />
            )}
            {currentSection === 'stock' && <StockSection data={data} onReload={reloadSection} />}
            {currentSection === 'orders' && <OrdersSection orders={data.orders} onReload={reloadSection} />}
            {currentSection === 'users' && <UsersSection users={data.users} />}
          </motion.div>
        )}
      </div>
      {toast && (
        <div className="admin-toast" role="status" aria-live="polite">
          <span className="admin-toast-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4" />
            </svg>
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  )
}

function DashboardSection({ data, onNavigate }) {
  const orders = data.orders || []
  const metrics = [
    { label: 'Produits', value: data.products?.length || 0, target: 'products' },
    { label: 'Catégories', value: data.categories?.length || 0, target: 'categories' },
    { label: 'Marques', value: data.brands?.length || 0, target: 'brands' },
    { label: 'Clients', value: data.users?.length || '—', target: 'users' },
    { label: 'En attente', value: orders.filter((order) => order.status === 'pending').length, target: 'orders' },
    { label: 'Confirmées', value: orders.filter((order) => order.status === 'confirmed').length, target: 'orders' },
    { label: 'Annulées', value: orders.filter((order) => order.status === 'cancelled').length, target: 'orders' },
  ]

  return (
    <>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Administration</span>
          <h2>Dashboard</h2>
          <p>Vue d’ensemble de votre boutique.</p>
        </div>
        <span className="count-pill">{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
      </div>

      <div className="admin-metrics">
        {metrics.map((metric) => (
          <button key={metric.label} type="button" onClick={() => onNavigate(metric.target)}>
            <span className="admin-metric-icon">{adminIcons[metric.target === 'orders' ? 'orders' : metric.target]}</span>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="eyebrow eyebrow-dark">Commandes récentes</span>
            <h3>Les 5 dernières commandes</h3>
          </div>
        </div>
        <OrdersTable orders={orders.slice(0, 5)} />
      </div>
    </>
  )
}

const PRODUCT_STATUS_LABELS = {
  draft: 'Brouillon',
  active: 'Visible',
  inactive: 'Masqué',
  archived: 'Archivé',
}

/** A hidden product can be shown once it has a visible default price (variant). */
function canPublish(product) {
  return (product.product_variants || []).some((variant) => variant.is_default && variant.status === 'active')
}

function priceLabel(product) {
  const prices = (product.product_variants || []).filter((variant) => variant.status === 'active')
    .map((variant) => Number(variant.price_tnd)).filter((price) => price > 0)
  if (!prices.length) return 'Sans prix'
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  return low === high ? `${low.toFixed(3)} TND` : `${low.toFixed(3)} – ${high.toFixed(3)} TND`
}

function ProductsSection({ products = [], onReload }) {
  const [editing, setEditing] = useState(null) // null: closed, 'new', or a product
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    Promise.all([getAdminCategories(), getAdminBrands()])
      .then(([categoriesResponse, brandsResponse]) => {
        setCategories(categoriesResponse.data || categoriesResponse || [])
        setBrands(brandsResponse.data || brandsResponse || [])
      })
      .catch(() => {})
  }, [])

  const hidden = products.filter((product) => product.status !== 'active')
  const publishable = hidden.filter(canPublish)
  const search = query.trim().toLowerCase()
  const shown = search
    ? products.filter((product) => [product.name, product.slug, product.brands?.name, product.categories?.name]
      .some((value) => String(value || '').toLowerCase().includes(search)))
    : products

  function open(target) {
    setMessage('')
    setError('')
    setEditing(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function publishAll() {
    if (!window.confirm(`Rendre visibles ${publishable.length} produit(s) dans la boutique ?`)) return
    setPublishing(true)
    setError('')
    setMessage('')
    const results = await Promise.allSettled(publishable.map((product) => updateAdminProduct(product.id, { status: 'active' })))
    const failed = results.filter((result) => result.status === 'rejected').length
    const skipped = hidden.length - publishable.length
    setMessage([
      `${results.length - failed} produit(s) publié(s).`,
      failed ? `${failed} échec(s).` : '',
      skipped ? `${skipped} produit(s) sans prix visible n’ont pas été publiés : ouvrez-les pour ajouter un prix.` : '',
    ].filter(Boolean).join(' '))
    setPublishing(false)
    onReload()
  }

  async function remove(product) {
    if (!window.confirm(`Supprimer « ${product.name} » ? Préférez « Masqué » si le produit a déjà été commandé.`)) return
    setError('')
    try {
      await deleteAdminProduct(product.id)
      if (editing?.id === product.id) setEditing(null)
      onReload()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Catalogue</span>
          <h2>Produits</h2>
          <p>{products.length - hidden.length} visible(s) dans la boutique · {hidden.length} masqué(s)</p>
        </div>
        <div className="admin-heading-actions">
          {publishable.length > 0 && (
            <button type="button" className="button button-secondary" onClick={publishAll} disabled={publishing}>
              {publishing ? 'Publication…' : `Tout publier (${publishable.length})`}
            </button>
          )}
          <button type="button" className="button" onClick={() => open('new')}>＋ Nouveau produit</button>
        </div>
      </div>

      {error && <p className="form-message is-error" role="alert">{error}</p>}
      {message && <p className="form-message is-success" role="status">{message}</p>}

      {editing && (
        <ProductEditor
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          categories={categories}
          brands={brands}
          onClose={() => setEditing(null)}
          onSaved={onReload}
        />
      )}

      <div className="admin-toolbar">
        <input type="search" placeholder="Rechercher un produit, une marque, une catégorie…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Rechercher un produit" />
      </div>

      {shown.length === 0 ? (
        <p className="notice">{products.length ? 'Aucun produit ne correspond à la recherche.' : 'Aucun produit enregistré.'}</p>
      ) : (
        <div className="product-admin-list">
          {shown.map((product) => (
            <article className={`product-admin-card${editing?.id === product.id ? ' is-editing' : ''}`} key={product.id}>
              <ImageWithFallback
                src={resolveImageUrl(getProductImagePath(product))}
                alt=""
                className="product-admin-thumb"
                fallbackClassName="product-admin-thumb product-admin-thumb-empty"
                loading="lazy"
              />
              <div className="product-admin-info">
                <strong>{product.name}</strong>
                <small>{[product.brands?.name, product.categories?.name].filter(Boolean).join(' · ') || '—'}</small>
                <small>{priceLabel(product)} · {(product.product_variants || []).length} variante(s)</small>
              </div>
              <span className={`visibility-pill ${product.status === 'active' ? 'is-visible' : ''}`}>
                {product.status === 'active' ? 'Visible' : (PRODUCT_STATUS_LABELS[product.status] || 'Masqué')}
              </span>
              <span className="admin-row-actions">
                <button type="button" className="button button-small" onClick={() => open(product)}>Modifier</button>
                <button type="button" className="danger-text" onClick={() => remove(product)}>Supprimer</button>
              </span>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

function CatalogSection({
  title,
  itemLabel,
  items = [],
  emptyMessage,
  imagePlaceholder,
  createItem,
  updateItem,
  deleteItem,
  onReload,
}) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyCatalogForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditing(null)
    setForm(emptyCatalogForm)
    setError('')
  }

  function edit(item) {
    setEditing(item)
    setForm({
      name: item.name || '',
      slug: item.slug || '',
      image_path: item.image_path || '',
    })
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      image_path: form.image_path.trim() || null,
    }
    try {
      if (editing) await updateItem(editing.id, payload)
      else await createItem(payload)
      resetForm()
      await onReload()
    } catch (requestError) {
      setError(requestError.message || `Impossible d’enregistrer la ${itemLabel}.`)
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    if (!window.confirm(`Supprimer la ${itemLabel} « ${item.name} » ?`)) return
    setError('')
    try {
      await deleteItem(item.id)
      if (editing?.id === item.id) resetForm()
      await onReload()
    } catch (requestError) {
      setError(requestError.message || `Impossible de supprimer la ${itemLabel}.`)
    }
  }

  return (
    <>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Catalogue</span>
          <h2>{title}</h2>
          <p>Gérez les {itemLabel}s de la boutique.</p>
        </div>
        <span className="count-pill">{items.length}</span>
      </div>
      <div className="admin-panel">
        <form className="admin-form" onSubmit={save}>
        <label>
          Nom
          <input
            required
            maxLength={120}
            placeholder={`Nom de la ${itemLabel}`}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          Slug
          <input
            required
            maxLength={200}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder={`nom-de-la-${itemLabel}`}
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
          />
        </label>
        <label>
          Chemin de l’image
          <input
            maxLength={500}
            placeholder={imagePlaceholder}
            value={form.image_path}
            onChange={(event) => setForm({ ...form, image_path: event.target.value })}
          />
        </label>
        <div className="admin-form-actions">
          <button className="button" type="submit" disabled={saving}>
            {editing ? 'Modifier' : 'Ajouter'}
          </button>
          {editing && <button type="button" onClick={resetForm}>Annuler</button>}
        </div>
        {error && <p className="form-message is-error" role="alert">{error}</p>}
      </form>
      </div>
      {items.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <div className="admin-table">
          <div className="admin-row admin-catalog-row admin-row-head">
            <span>Image</span>
            <span>Nom</span>
            <span>Slug</span>
            <span>Produits</span>
            <span>Actions</span>
          </div>
          {items.map((item) => (
            <div className="admin-row admin-catalog-row" key={item.id}>
              <ImageWithFallback
                className="admin-catalog-image"
                src={resolveImageUrl(item.image_path)}
                alt={item.name}
                fallbackClassName="admin-catalog-image-placeholder"
                fallbackLabel={`Image de la ${itemLabel} ${item.name}`}
              />
              <span data-label="Nom">
                <strong>{item.name}</strong>
                {item.is_active === false && <small>Inactif</small>}
              </span>
              <span data-label="Slug">{item.slug}</span>
              <span data-label="Produits">{Number(item.product_count || 0)}</span>
              <span className="admin-row-actions" data-label="Actions">
                <button type="button" onClick={() => edit(item)}>Modifier</button>
                <button type="button" className="danger-text" onClick={() => remove(item)}>Supprimer</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function StockSection({ data, onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ delta: '', reason: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inventory = data.inventory || []
  const movements = data.movements || []

  function startAdjust(item) {
    setEditing(item.variant_id)
    setForm({ delta: '', reason: '' })
    setError('')
  }

  function cancelAdjust() {
    setEditing(null)
    setForm({ delta: '', reason: '' })
    setError('')
  }

  async function saveAdjust(event, item) {
    event.preventDefault()
    const delta = Number(form.delta)
    const reason = form.reason.trim()
    if (!Number.isInteger(delta) || delta === 0) {
      setError('La variation doit être un entier différent de zéro.')
      return
    }
    if (!reason) {
      setError('Le motif de l’ajustement est obligatoire.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await adjustInventory(item.variant_id, { delta, reason })
      cancelAdjust()
      await onReload(false)
    } catch (requestError) {
      setError(requestError.message || 'Impossible d’ajuster le stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Inventaire</span>
          <h2>Stock</h2>
          <p>Suivez et ajustez les quantités disponibles.</p>
        </div>
        <span className="count-pill">{inventory.length}</span>
      </div>
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      {inventory.length === 0 ? (
        <p>Aucun stock enregistré.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-row admin-stock-row admin-row-head">
            <span>Produit</span>
            <span>SKU</span>
            <span>Variante</span>
            <span>Stock (on_hand)</span>
            <span>Réservé (reserved)</span>
            <span>Disponible</span>
            <span>Actions</span>
          </div>
          {inventory.map((item) => {
            const variant = item.product_variants || {}
            const available = Number(item.available ?? (item.on_hand - item.reserved))
            return (
              <div className="admin-stock-item" key={item.variant_id}>
                <div className="admin-row admin-stock-row">
                  <span data-label="Produit"><strong>{variant.products?.name || '—'}</strong></span>
                  <span data-label="SKU">{variant.sku || '—'}</span>
                  <span data-label="Variante">{variant.name || item.variant_id}</span>
                  <span data-label="Stock">{item.on_hand}</span>
                  <span data-label="Réservé">{item.reserved}</span>
                  <span data-label="Disponible">{available}</span>
                  <span className="admin-row-actions" data-label="Actions">
                    <button type="button" onClick={() => startAdjust(item)}>Ajuster</button>
                  </span>
                </div>
                {editing === item.variant_id && (
                  <form className="admin-stock-adjust" onSubmit={(event) => saveAdjust(event, item)}>
                    <label>
                      Variation
                      <input
                        type="number"
                        step="1"
                        required
                        placeholder="+5 ou -2"
                        value={form.delta}
                        onChange={(event) => setForm({ ...form, delta: event.target.value })}
                      />
                    </label>
                    <label>
                      Motif
                      <input
                        required
                        maxLength={500}
                        placeholder="Réapprovisionnement, inventaire…"
                        value={form.reason}
                        onChange={(event) => setForm({ ...form, reason: event.target.value })}
                      />
                    </label>
                    <div className="admin-form-actions">
                      <button className="button" type="submit" disabled={saving}>Valider</button>
                      <button type="button" onClick={cancelAdjust}>Annuler</button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
      <h3>Historique</h3>
      {movements.length === 0 ? (
        <p>Aucun mouvement enregistré.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-row admin-movement-row admin-row-head">
            <span>Date</span>
            <span>Variante</span>
            <span>Quantité</span>
            <span>Motif</span>
          </div>
          {movements.map((movement) => {
            const variant = movement.product_variants || {}
            const label = variant.products?.name
              ? `${variant.products.name}${variant.name ? ` — ${variant.name}` : ''}`
              : (variant.name || variant.sku || movement.variant_id)
            return (
              <div className="admin-row admin-movement-row" key={movement.id}>
                <span data-label="Date">{new Date(movement.created_at).toLocaleString('fr-FR')}</span>
                <span data-label="Variante">{label}</span>
                <span data-label="Quantité">{movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}</span>
                <span data-label="Motif">{movement.reason}</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function OrdersSection({ orders = [], onReload }) {
  async function change(action, id) { await action(id); onReload() }
  return (
    <>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Commandes</span>
          <h2>Commandes</h2>
          <p>Confirmez ou annulez les commandes en attente.</p>
        </div>
        <span className="count-pill">{orders.length}</span>
      </div>
      <OrdersTable orders={orders} onConfirm={(id) => change(confirmAdminOrder, id)} onCancel={(id) => change(cancelAdminOrder, id)} />
    </>
  )
}

function OrdersTable({ orders = [], onConfirm, onCancel }) {
  const [openId, setOpenId] = useState(null)
  return (
    <div className="admin-table">
      <div className="admin-row admin-orders-row admin-row-head">
        <span>Numéro / date</span>
        <span>Client / téléphone</span>
        <span>Montant</span>
        <span>Statut / actions</span>
      </div>
      {orders.map((order) => (
        <div className="admin-order-block" key={order.id}>
          <div className="admin-row admin-orders-row">
            <span data-label="Commande">
              <strong>{order.order_number}</strong>
              <small>{formatAdminDateTime(order.created_at)}</small>
            </span>
            <span data-label="Client">
              {order.shipping_address_snapshot?.recipient_name || order.customer_email}
              <small>{order.customer_phone}</small>
            </span>
            <span data-label="Montant">{Number(order.total_tnd).toFixed(3)} TND</span>
            <span className="admin-row-actions" data-label="Statut">
              <StatusBadge status={order.status} />
              <button
                type="button"
                aria-expanded={openId === order.id}
                onClick={() => setOpenId(openId === order.id ? null : order.id)}
              >
                {openId === order.id ? 'Masquer' : 'Détails'}
              </button>
              {order.status === 'pending' && onConfirm && (
                <>
                  <button type="button" className="button button-small" onClick={() => onConfirm(order.id)}>Confirmer</button>
                  <button type="button" className="danger-text" onClick={() => onCancel(order.id)}>Annuler</button>
                </>
              )}
            </span>
          </div>
          {openId === order.id && <AdminOrderDetails order={order} />}
        </div>
      ))}
    </div>
  )
}

const PAYMENT_METHOD_LABELS = { cash_on_delivery: 'Paiement à la livraison' }
const PAYMENT_STATUS_LABELS = { pending: 'En attente', paid: 'Payé', failed: 'Échoué', refunded: 'Remboursé' }

function formatAdminDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Everything about one order and its customer (account details for logged-in customers). */
function AdminOrderDetails({ order }) {
  const address = order.shipping_address_snapshot || {}
  const items = order.order_items || []
  const [customer, setCustomer] = useState(null)
  const [customerError, setCustomerError] = useState('')

  useEffect(() => {
    if (!order.profile_id) return undefined
    let active = true
    getAdminUser(order.profile_id)
      .then((response) => { if (active) setCustomer(response.data || response) })
      .catch((requestError) => { if (active) setCustomerError(requestError.message || 'Compte client introuvable.') })
    return () => { active = false }
  }, [order.profile_id])

  const previousOrders = (customer?.orders || []).filter((other) => other.id !== order.id)

  return (
    <div className="admin-order-details">
      <section>
        <h4>Client</h4>
        <dl>
          <dt>Nom</dt><dd>{address.recipient_name || customer?.full_name || '—'}</dd>
          <dt>Téléphone</dt><dd>{order.customer_phone ? <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a> : '—'}</dd>
          <dt>E-mail</dt><dd>{order.customer_email ? <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a> : '—'}</dd>
          <dt>Type</dt><dd>{order.profile_id ? 'Compte client' : 'Invité (sans compte)'}</dd>
          {order.profile_id && (
            <>
              <dt>Nom du compte</dt><dd>{customer ? (customer.full_name || '—') : (customerError ? '—' : '…')}</dd>
              <dt>Téléphone du compte</dt><dd>{customer?.phone || '—'}</dd>
              <dt>Client depuis</dt><dd>{customer ? formatAdminDate(customer.created_at) : '…'}</dd>
              <dt>Autres commandes</dt>
              <dd>
                {customer
                  ? `${previousOrders.length} (total ${previousOrders.reduce((sum, other) => sum + Number(other.total_tnd || 0), 0).toFixed(3)} TND)`
                  : '…'}
              </dd>
            </>
          )}
        </dl>
        {customerError && <p className="form-message is-error" role="alert">{customerError}</p>}
      </section>

      <section>
        <h4>Livraison</h4>
        <dl>
          <dt>Destinataire</dt><dd>{address.recipient_name || '—'}</dd>
          <dt>Téléphone</dt><dd>{address.phone || order.customer_phone || '—'}</dd>
          <dt>Adresse</dt><dd>{address.address_line || '—'}</dd>
          <dt>Ville</dt><dd>{address.city || '—'}</dd>
          <dt>Gouvernorat</dt><dd>{address.governorate || '—'}</dd>
          <dt>Code postal</dt><dd>{address.postal_code || '—'}</dd>
        </dl>
      </section>

      <section>
        <h4>Commande</h4>
        <dl>
          <dt>Numéro</dt><dd>{order.order_number}</dd>
          <dt>Statut</dt><dd><StatusBadge status={order.status} /></dd>
          <dt>Passée le</dt><dd>{formatAdminDateTime(order.created_at)}</dd>
          <dt>Mise à jour</dt><dd>{formatAdminDateTime(order.updated_at)}</dd>
          <dt>Paiement</dt>
          <dd>
            {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
            {' · '}
            {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status || '—'}
          </dd>
        </dl>
      </section>

      <section className="admin-order-details-items">
        <h4>Articles</h4>
        <table>
          <thead>
            <tr><th>Produit</th><th>SKU</th><th>Prix unitaire</th><th>Qté</th><th>Total</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.product_name_snapshot}<small>{item.variant_name_snapshot}</small></td>
                <td>{item.sku_snapshot || '—'}</td>
                <td>{Number(item.unit_price_tnd).toFixed(3)} TND</td>
                <td>{item.quantity}</td>
                <td>{Number(item.line_total_tnd).toFixed(3)} TND</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4}>Sous-total</td><td>{Number(order.subtotal_tnd).toFixed(3)} TND</td></tr>
            <tr><td colSpan={4}>Livraison</td><td>{Number(order.shipping_cost_tnd) ? `${Number(order.shipping_cost_tnd).toFixed(3)} TND` : 'Offerte'}</td></tr>
            <tr><td colSpan={4}><strong>Total à encaisser</strong></td><td><strong>{Number(order.total_tnd).toFixed(3)} TND</strong></td></tr>
          </tfoot>
        </table>
      </section>
    </div>
  )
}

function formatAdminDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR')
}

function UsersSection({ users = [] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('created_at_desc')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailStatus, setDetailStatus] = useState('idle')
  const [error, setError] = useState('')

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = users.filter((user) => {
      if (!needle) return true
      return String(user.full_name || '').toLowerCase().includes(needle)
        || String(user.phone || '').toLowerCase().includes(needle)
    })
    const separator = sort.lastIndexOf('_')
    const field = sort.slice(0, separator)
    const direction = sort.slice(separator + 1)
    const factor = direction === 'asc' ? 1 : -1
    return rows.sort((a, b) => {
      if (field === 'order_count') {
        return (Number(a.order_count || 0) - Number(b.order_count || 0)) * factor
      }
      if (field === 'full_name') {
        return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'fr') * factor
      }
      return (new Date(a.created_at || 0) - new Date(b.created_at || 0)) * factor
    })
  }, [users, query, sort])

  async function openDetail(user) {
    setSelectedId(user.id)
    setDetail(null)
    setDetailStatus('loading')
    setError('')
    try {
      const response = await getAdminUser(user.id)
      setDetail(response?.data || response)
      setDetailStatus('ready')
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger cet utilisateur.')
      setDetailStatus('error')
    }
  }

  function closeDetail() {
    setSelectedId(null)
    setDetail(null)
    setDetailStatus('idle')
    setError('')
  }

  const sortOptions = [
    ['created_at_desc', 'Inscription récente'],
    ['created_at_asc', 'Inscription ancienne'],
    ['full_name_asc', 'Nom A → Z'],
    ['full_name_desc', 'Nom Z → A'],
    ['order_count_desc', 'Plus de commandes'],
    ['order_count_asc', 'Moins de commandes'],
  ]

  return (
    <>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Utilisateurs</span>
          <h2>Utilisateurs</h2>
          <p>Consultez les profils et l’historique des commandes.</p>
        </div>
        <span className="count-pill">{visibleUsers.length}</span>
      </div>
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      <div className="admin-toolbar">
        <label>
          Recherche
          <input
            type="search"
            placeholder="Nom ou téléphone"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Tri
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {sortOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {visibleUsers.length === 0 ? (
        <p>Aucun utilisateur trouvé.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-row admin-users-row admin-row-head">
            <span>Nom</span>
            <span>Téléphone</span>
            <span>Rôle</span>
            <span>Inscription</span>
            <span>Commandes</span>
            <span>Détail</span>
          </div>
          {visibleUsers.map((user) => {
            const orderCount = Number(user.order_count || 0)
            return (
              <div className="admin-row admin-users-row" key={user.id}>
                <span data-label="Nom"><strong>{user.full_name || '—'}</strong></span>
                <span data-label="Téléphone">{user.phone || '—'}</span>
                <span data-label="Rôle"><RoleBadge role={user.role} /></span>
                <span data-label="Inscription">{formatAdminDate(user.created_at)}</span>
                <span data-label="Commandes">{orderCount} commande{orderCount > 1 ? 's' : ''}</span>
                <span className="admin-row-actions" data-label="Détail">
                  <button type="button" onClick={() => openDetail(user)}>
                    {selectedId === user.id ? 'Actualiser' : 'Voir'}
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      )}
      {selectedId && (
        <section className="admin-user-detail">
          <div className="admin-user-detail-head">
            <h3>Détail utilisateur</h3>
            <button type="button" onClick={closeDetail}>Fermer</button>
          </div>
          {detailStatus === 'loading' && <p>Chargement…</p>}
          {detailStatus === 'error' && <p role="alert">Détail indisponible.</p>}
          {detailStatus === 'ready' && detail && (
            <>
              <dl className="admin-user-facts">
                <div><dt>Nom</dt><dd>{detail.full_name || '—'}</dd></div>
                <div><dt>Téléphone</dt><dd>{detail.phone || '—'}</dd></div>
                <div><dt>Rôle</dt><dd><RoleBadge role={detail.role} /></dd></div>
                <div><dt>Date d’inscription</dt><dd>{formatAdminDate(detail.created_at)}</dd></div>
                <div><dt>Commandes</dt><dd>{Number(detail.order_count || 0)}</dd></div>
                <div>
                  <dt>Montant total commandé</dt>
                  <dd>{Number(detail.total_ordered_tnd || 0).toFixed(3)} TND</dd>
                </div>
              </dl>

              <div className="admin-user-section">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow eyebrow-dark">Adresses</span>
                    <h4>Adresses enregistrées</h4>
                  </div>
                  <span className="count-pill">{(detail.addresses || []).length}</span>
                </div>
                {(detail.addresses || []).length === 0 ? (
                  <p className="notice">Aucune adresse enregistrée.</p>
                ) : (
                  <div className="admin-address-grid">
                    {detail.addresses.map((address) => (
                      <article className="admin-address-card" key={address.id}>
                        <div className="admin-address-head">
                          <strong>{address.label || 'Adresse'}</strong>
                          {address.is_default && <span className="mini-badge">Par défaut</span>}
                        </div>
                        <p>{address.recipient_name}</p>
                        <p>{address.phone}</p>
                        <p>{address.address_line}</p>
                        <p>{address.city}, {address.governorate} {address.postal_code || ''}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-user-section">
                <div className="admin-panel-heading">
                  <div>
                    <span className="eyebrow eyebrow-dark">Commandes</span>
                    <h4>Historique des commandes</h4>
                  </div>
                  <span className="count-pill">{(detail.orders || []).length}</span>
                </div>
                {(detail.orders || []).length === 0 ? (
                  <p className="notice">Aucune commande.</p>
                ) : (
                  <div className="admin-table">
                    <div className="admin-row admin-user-order-row admin-row-head">
                      <span>Numéro</span>
                      <span>Date</span>
                      <span>Statut</span>
                      <span>Montant</span>
                    </div>
                    {detail.orders.map((order) => (
                      <div className="admin-row admin-user-order-row" key={order.id}>
                        <span data-label="Numéro"><strong>{order.order_number}</strong></span>
                        <span data-label="Date">{formatAdminDate(order.created_at)}</span>
                        <span data-label="Statut"><StatusBadge status={order.status} /></span>
                        <span data-label="Montant">{Number(order.total_tnd || 0).toFixed(3)} TND</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </>
  )
}

export default AdminDashboardPage
