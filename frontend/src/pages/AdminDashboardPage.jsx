import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import RoleBadge from '../components/RoleBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
  adjustInventory, createAdminBrand, createAdminCategory, createAdminProduct,
  createAdminProductVariant, deleteAdminBrand, deleteAdminCategory,
  deleteAdminProduct, deleteAdminProductVariant, getAdminBrands,
  getAdminCategories, getAdminInventory, getAdminOrders, getAdminProducts,
  getAdminProductVariants, getAdminUser, getAdminUsers, getInventoryMovements,
  updateAdminBrand, updateAdminCategory, updateAdminProduct,
  updateAdminProductVariant,
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
            {currentSection === 'products' && <ProductsSection products={data.products} onReload={loadSection} />}
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
                onReload={loadSection}
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
                onReload={loadSection}
              />
            )}
            {currentSection === 'stock' && <StockSection data={data} onReload={loadSection} />}
            {currentSection === 'orders' && <OrdersSection orders={data.orders} onReload={loadSection} />}
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

function ProductsSection({ products = [], onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', category_id: '', brand_id: '', price_tnd: '', stock: '' })
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [variants, setVariants] = useState([])
  const [variantForm, setVariantForm] = useState({
    name: '', sku: '', price_tnd: '', stock: 0, is_default: false, status: 'active', model: '',
  })
  const [editingVariant, setEditingVariant] = useState(null)
  const [variantError, setVariantError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAdminCategories(), getAdminBrands()])
      .then(([categoriesResponse, brandsResponse]) => {
        setCategories(categoriesResponse.data || categoriesResponse || [])
        setBrands(brandsResponse.data || brandsResponse || [])
      })
      .catch(() => {})
  }, [])

  async function loadVariants(productId) {
    if (!productId) {
      setVariants([])
      return
    }
    try {
      const response = await getAdminProductVariants(productId)
      setVariants(response.data || response || [])
    } catch (requestError) {
      setVariantError(requestError.message || 'Impossible de charger les variantes.')
    }
  }

  async function startEdit(product) {
    setEditing(product)
    setError('')
    let loadedVariants = []
    try {
      const response = await getAdminProductVariants(product.id)
      loadedVariants = response.data || response || []
      setVariants(loadedVariants)
    } catch (requestError) {
      setVariantError(requestError.message || 'Impossible de charger les variantes.')
    }
    const primaryVariant = loadedVariants.length === 1 ? loadedVariants[0] : null
    setForm({
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      price_tnd: primaryVariant ? primaryVariant.price_tnd : '',
      stock: primaryVariant ? primaryVariant.on_hand : '',
    })
  }

  async function saveVariant(event) {
    event.preventDefault()
    if (!editing) return
    const payload = {
      name: variantForm.name,
      sku: variantForm.sku,
      price_tnd: Number(variantForm.price_tnd),
      stock: Number(variantForm.stock),
      is_default: variantForm.is_default,
      status: variantForm.status,
      attributes: { model: variantForm.model || 'Standard' },
    }
    setVariantError('')
    try {
      if (editingVariant) {
        await updateAdminProductVariant(editingVariant.id, payload)
      } else {
        await createAdminProductVariant(editing.id, payload)
      }
      setEditingVariant(null)
      setVariantForm({ name: '', sku: '', price_tnd: '', stock: 0, is_default: false, status: 'active', model: '' })
      await loadVariants(editing.id)
    } catch (requestError) {
      setVariantError(requestError.message || 'Impossible d’enregistrer la variante.')
    }
  }

  async function removeVariant(id) {
    if (!window.confirm('Supprimer cette variante ?')) return
    try {
      await deleteAdminProductVariant(id)
      await loadVariants(editing.id)
    } catch (requestError) {
      setVariantError(requestError.message || 'Impossible de supprimer la variante.')
    }
  }

  function startEditVariant(variant) {
    setEditingVariant(variant)
    setVariantForm({
      name: variant.name || '',
      sku: variant.sku || '',
      price_tnd: variant.price_tnd ?? '',
      stock: Number(variant.on_hand ?? 0),
      is_default: Boolean(variant.is_default),
      status: variant.status || 'active',
      model: variant.attributes?.model || 'Standard',
    })
    setVariantError('')
  }

  async function save(event) {
    event.preventDefault()
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      ...(form.category_id ? { category_id: form.category_id } : {}),
      ...(form.brand_id ? { brand_id: form.brand_id } : {}),
      ...(!editing ? { status: 'draft' } : {}),
    }
    try {
      if (editing) {
        await updateAdminProduct(editing.id, payload)
        const primaryVariant = variants.length === 1 ? variants[0] : null
        if (primaryVariant && form.price_tnd !== '' && form.stock !== '') {
          await updateAdminProductVariant(primaryVariant.id, {
            price_tnd: Number(form.price_tnd),
            stock: Number(form.stock),
          })
        } else if (!primaryVariant && variants.length === 0 && form.price_tnd !== '' && form.stock !== '') {
          await createAdminProductVariant(editing.id, {
            name: 'Standard',
            sku: form.slug || editing.slug,
            price_tnd: Number(form.price_tnd),
            stock: Number(form.stock),
            is_default: true,
            status: 'active',
          })
        }
        await loadVariants(editing.id)
      } else {
        const response = await createAdminProduct(payload)
        const createdProduct = response?.data || response
        setEditing(createdProduct)
        setForm({
          name: createdProduct.name || payload.name,
          slug: createdProduct.slug || payload.slug,
          description: createdProduct.description || payload.description || '',
          category_id: createdProduct.category_id || payload.category_id || '',
          brand_id: createdProduct.brand_id || payload.brand_id || '',
          price_tnd: form.price_tnd,
          stock: form.stock,
        })
        if (form.price_tnd !== '' && form.stock !== '') {
          await createAdminProductVariant(createdProduct.id, {
            name: 'Standard',
            sku: createdProduct.slug || payload.slug,
            price_tnd: Number(form.price_tnd),
            stock: Number(form.stock),
            is_default: true,
            status: 'active',
          })
        }
        await loadVariants(createdProduct.id)
      }
      onReload()
    } catch (requestError) {
      setError(requestError.message || 'Impossible d’enregistrer le produit.')
    }
  }

  async function remove(id) {
    if (!window.confirm('Supprimer ce produit ?')) return
    try {
      await deleteAdminProduct(id)
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
          <p>Créez, modifiez ou supprimez les produits du catalogue.</p>
        </div>
        <span className="count-pill">{products.length}</span>
      </div>

      <div className="admin-panel">
        <form className="admin-form" onSubmit={save}>
          <div className="admin-form-grid">
            <label>
              Catégorie
              <select required={!editing} value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
                <option value="">Choisir une catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              Marque
              <select required={!editing} value={form.brand_id} onChange={(event) => setForm({ ...form, brand_id: event.target.value })}>
                <option value="">Choisir une marque</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label>
              Prix principal (TND)
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.000"
                value={form.price_tnd}
                disabled={variants.length > 1}
                onChange={(event) => setForm({ ...form, price_tnd: event.target.value })}
              />
              {variants.length > 1 && <small>Plusieurs variantes : utilisez la section Variantes.</small>}
            </label>
            <label>
              Stock principal
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={form.stock}
                disabled={variants.length > 1}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
              />
            </label>
            <label>
              Nom
              <input required placeholder="Nom du produit" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Slug
              <input required placeholder="nom-du-produit" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            </label>
            <label className="admin-form-wide">
              Description
              <textarea placeholder="Description du produit" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="button" type="submit">{editing ? 'Modifier' : 'Créer'}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setVariants([]); setEditingVariant(null); setForm({ name: '', slug: '', description: '', category_id: '', brand_id: '', price_tnd: '', stock: '' }); setVariantForm({ name: '', sku: '', price_tnd: '', stock: 0, is_default: false, status: 'active' }) }}>Annuler</button>}
          </div>
          {error && <p className="form-message is-error" role="alert">{error}</p>}
        </form>
      </div>

      {editing && (
        <div className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="eyebrow eyebrow-dark">Variantes</span>
              <h3>Variantes de {editing.name}</h3>
            </div>
            <span className="count-pill">{variants.length}</span>
          </div>

          <form className="admin-form" onSubmit={saveVariant}>
            <div className="admin-form-grid">
              <label>
                Nom
                <input required placeholder="Nom de la variante" value={variantForm.name} onChange={(event) => setVariantForm({ ...variantForm, name: event.target.value })} />
              </label>
              <label>
                SKU
                <input required placeholder="SKU" value={variantForm.sku} onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value })} />
              </label>
              <label>
                Prix (TND)
                <input required type="number" step="0.001" min="0" placeholder="0.000" value={variantForm.price_tnd} onChange={(event) => setVariantForm({ ...variantForm, price_tnd: event.target.value })} />
              </label>
              <label>
                Stock
                <input required type="number" step="1" min="0" value={variantForm.stock} onChange={(event) => setVariantForm({ ...variantForm, stock: event.target.value })} />
              </label>
              <label>
                Statut
                <select value={variantForm.status} onChange={(event) => setVariantForm({ ...variantForm, status: event.target.value })}>
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="inactive">inactive</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label>
                Modèle
                <input placeholder="Gear, Star, 15K..." value={variantForm.model} onChange={(event) => setVariantForm({ ...variantForm, model: event.target.value })} />
              </label>
              <label className="checkbox-field">
                <input type="checkbox" checked={variantForm.is_default} onChange={(event) => setVariantForm({ ...variantForm, is_default: event.target.checked })} />
                Variante par défaut
              </label>
            </div>
            <div className="admin-form-actions">
              <button className="button" type="submit">{editingVariant ? 'Modifier la variante' : 'Ajouter la variante'}</button>
              {editingVariant && (
                <button type="button" onClick={() => { setEditingVariant(null); setVariantForm({ name: '', sku: '', price_tnd: '', stock: 0, is_default: false, status: 'active' }) }}>
                  Annuler
                </button>
              )}
            </div>
            {variantError && <p className="form-message is-error" role="alert">{variantError}</p>}
          </form>

          {variants.length === 0 ? (
            <p className="notice">Aucune variante enregistrée.</p>
          ) : (
            <div className="admin-table">
              <div className="admin-row admin-variant-row admin-row-head">
                <span>Nom</span>
                <span>SKU</span>
                <span>Prix</span>
                <span>Stock</span>
                <span>Disponible</span>
                <span>Actions</span>
              </div>
              {variants.map((variant) => (
                <div className="admin-row admin-variant-row" key={variant.id}>
                  <span data-label="Nom">
                    <strong>{variant.name}</strong>
                    {variant.is_default && <small>Par défaut</small>}
                  </span>
                  <span data-label="SKU">{variant.sku}</span>
                  <span data-label="Prix">{Number(variant.price_tnd).toFixed(3)} TND</span>
                  <span data-label="Stock">{variant.on_hand}</span>
                  <span data-label="Disponible">{variant.available}</span>
                  <span className="admin-row-actions" data-label="Actions">
                    <button type="button" onClick={() => startEditVariant(variant)}>Modifier</button>
                    <button type="button" className="danger-text" onClick={() => removeVariant(variant.id)}>Supprimer</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <p className="notice">Aucun produit enregistré.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-row admin-products-row admin-row-head">
            <span>Nom</span>
            <span>Slug</span>
            <span>Actions</span>
          </div>
          {products.map((product) => (
            <div className="admin-row admin-products-row" key={product.id}>
              <span data-label="Nom"><strong>{product.name}</strong></span>
              <span data-label="Slug">{product.slug}</span>
              <span className="admin-row-actions" data-label="Actions">
                <button type="button" onClick={() => startEdit(product)}>Modifier</button>
                <button type="button" className="danger-text" onClick={() => remove(product.id)}>Supprimer</button>
              </span>
            </div>
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
  return (
    <div className="admin-table">
      <div className="admin-row admin-orders-row admin-row-head">
        <span>Numéro / date</span>
        <span>Client / téléphone</span>
        <span>Montant</span>
        <span>Statut / actions</span>
      </div>
      {orders.map((order) => (
        <div className="admin-row admin-orders-row" key={order.id}>
          <span data-label="Commande">
            <strong>{order.order_number}</strong>
            <small>{new Date(order.created_at).toLocaleDateString('fr-FR')}</small>
          </span>
          <span data-label="Client">
            {order.shipping_address_snapshot?.recipient_name || order.customer_email}
            <small>{order.customer_phone}</small>
          </span>
          <span data-label="Montant">{Number(order.total_tnd).toFixed(3)} TND</span>
          <span className="admin-row-actions" data-label="Statut">
            <StatusBadge status={order.status} />
            {order.status === 'pending' && onConfirm && (
              <>
                <button type="button" className="button button-small" onClick={() => onConfirm(order.id)}>Confirmer</button>
                <button type="button" className="danger-text" onClick={() => onCancel(order.id)}>Annuler</button>
              </>
            )}
          </span>
        </div>
      ))}
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
