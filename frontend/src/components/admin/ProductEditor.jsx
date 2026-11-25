import { useEffect, useState } from 'react'
import ProductPhotos from './ProductPhotos.jsx'
import {
  createAdminProduct, createAdminProductVariant, deleteAdminProductVariant,
  getAdminProductVariants, updateAdminProduct, updateAdminProductVariant,
} from '../../services/adminService.js'
import { getProductImages, uploadProductImage } from '../../services/productImageService.js'
import { slugify } from '../../utils/slug.js'

let rowCounter = 0
const newRow = (values = {}) => ({
  key: `new-${(rowCounter += 1)}`,
  id: null,
  name: '',
  price_tnd: '',
  stock: '0',
  is_default: false,
  visible: true,
  sku: '',
  model: '',
  ...values,
})

function rowFromVariant(variant) {
  return {
    key: variant.id,
    id: variant.id,
    name: variant.name || '',
    price_tnd: String(variant.price_tnd ?? ''),
    stock: String(variant.on_hand ?? 0),
    reserved: Number(variant.reserved || 0),
    is_default: Boolean(variant.is_default),
    visible: variant.status === 'active',
    sku: variant.sku || '',
    model: variant.attributes?.model || '',
    original: variant,
  }
}

function variantPayload(row, slug) {
  return {
    name: row.name.trim(),
    sku: row.sku.trim() || slugify(`${slug}-${row.name}`).toUpperCase(),
    price_tnd: Number(String(row.price_tnd).trim().replace(',', '.')),
    is_default: row.is_default,
    status: row.visible || row.is_default ? 'active' : 'inactive',
    attributes: { ...(row.original?.attributes || {}), model: row.model.trim() || 'Standard' },
  }
}

/** Fields of an existing variant that the admin actually changed. */
function changedFields(row, slug) {
  const next = variantPayload(row, slug)
  const before = row.original
  const changes = {}
  if (next.name !== before.name) changes.name = next.name
  if (row.sku.trim() && next.sku !== before.sku) changes.sku = next.sku
  if (Number(next.price_tnd) !== Number(before.price_tnd)) changes.price_tnd = next.price_tnd
  if (next.is_default !== Boolean(before.is_default)) changes.is_default = next.is_default
  if (next.status !== before.status) changes.status = next.status
  if ((before.attributes?.model || 'Standard') !== next.attributes.model) changes.attributes = next.attributes
  if (Number(row.stock) !== Number(before.on_hand)) changes.stock = Number(row.stock)
  return changes
}

function validate(info, rows) {
  if (!info.name.trim()) return 'Indiquez le nom du produit.'
  if (!info.slug) return 'Indiquez l’adresse du produit.'
  if (!info.category_id || !info.brand_id) return 'Choisissez une catégorie et une marque.'
  if (!rows.length) return 'Ajoutez au moins un prix (une variante).'
  for (const row of rows) {
    if (!row.name.trim()) return 'Chaque variante doit avoir un nom (ex. Standard, Menthe, 15K).'
    const price = String(row.price_tnd).trim().replace(',', '.')
    if (!/^\d+(\.\d{1,3})?$/.test(price) || !(Number(price) > 0)) {
      return `Prix invalide pour « ${row.name} » (nombre positif, 3 décimales max).`
    }
    const stock = Number(row.stock)
    if (row.stock === '' || !Number.isInteger(stock) || stock < 0) return `Stock invalide pour « ${row.name} » (nombre entier ≥ 0).`
    if (stock < (row.reserved || 0)) return `Le stock de « ${row.name} » ne peut pas être inférieur aux ${row.reserved} unité(s) réservée(s) par des commandes en attente.`
  }
  if (rows.filter((row) => row.is_default).length !== 1) return 'Choisissez une variante par défaut.'
  return ''
}

/**
 * Create or edit a product in one screen: information, photos, prices and
 * stock, with a single "Enregistrer" button (photos of a saved product are
 * applied immediately).
 */
function ProductEditor({ product, categories, brands, onClose, onSaved }) {
  const [saved, setSaved] = useState(product)
  const [info, setInfo] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    slugEdited: Boolean(product),
    description: product?.description || '',
    category_id: product?.category_id || '',
    brand_id: product?.brand_id || '',
    visible: product ? product.status === 'active' : true,
  })
  const [rows, setRows] = useState(product ? [] : [newRow({ name: 'Standard', is_default: true })])
  const [removed, setRemoved] = useState([])
  const [images, setImages] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [openDetails, setOpenDetails] = useState(null)
  const [loading, setLoading] = useState(Boolean(product))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadSaved(productId) {
    const [variantsResponse, imageRows] = await Promise.all([getAdminProductVariants(productId), getProductImages(productId)])
    const loaded = (variantsResponse.data || []).filter((variant) => variant.status !== 'archived').map(rowFromVariant)
    setRows(loaded.length ? loaded : [newRow({ name: 'Standard', is_default: true })])
    setRemoved([])
    setImages(imageRows || [])
  }

  useEffect(() => {
    if (!product) return
    loadSaved(product.id)
      .catch((loadError) => setError(loadError.message || 'Impossible de charger le produit.'))
      .finally(() => setLoading(false))
  }, [product])

  function setField(field, value) {
    setInfo((current) => {
      const next = { ...current, [field]: value }
      if (field === 'name' && !current.slugEdited) next.slug = slugify(value)
      if (field === 'slug') { next.slug = slugify(value); next.slugEdited = true }
      return next
    })
  }

  function setRow(key, field, value) {
    setRows((current) => current.map((row) => {
      if (field === 'is_default') return { ...row, is_default: row.key === key, visible: row.key === key ? true : row.visible }
      return row.key === key ? { ...row, [field]: value } : row
    }))
  }

  function removeRow(row) {
    if (row.is_default) {
      setError('Choisissez d’abord une autre variante par défaut avant de supprimer celle-ci.')
      return
    }
    setRows((current) => current.filter((other) => other.key !== row.key))
    if (row.id) setRemoved((current) => [...current, row])
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const problem = validate(info, rows)
    if (problem) { setError(problem); return }

    setSaving(true)
    let productRow = saved
    try {
      const fields = {
        name: info.name.trim(),
        slug: info.slug,
        description: info.description.trim(),
        category_id: info.category_id,
        brand_id: info.brand_id,
      }
      if (productRow) {
        productRow = (await updateAdminProduct(productRow.id, fields)).data
      } else {
        // Created hidden: the database refuses a visible product before its
        // default variant exists.
        productRow = (await createAdminProduct({ ...fields, status: 'draft' })).data
        setSaved(productRow)
      }

      // The new default first, so the product always keeps one.
      const ordered = [...rows].sort((left, right) => Number(right.is_default) - Number(left.is_default))
      for (const row of ordered) {
        if (!row.id) {
          await createAdminProductVariant(productRow.id, { ...variantPayload(row, info.slug), stock: Number(row.stock) })
        } else {
          const changes = changedFields(row, info.slug)
          if (Object.keys(changes).length) await updateAdminProductVariant(row.id, changes)
        }
      }
      for (const row of removed) {
        try {
          await deleteAdminProductVariant(row.id)
        } catch {
          // Variants with stock or order history cannot be deleted: archive
          // them instead (removed from the shop and from this editor).
          await updateAdminProductVariant(row.id, { status: 'archived' })
        }
      }

      // A photo that fails must not block the product: report it at the end.
      const photoErrors = []
      for (const [index, pending] of pendingFiles.entries()) {
        try {
          await uploadProductImage(productRow.id, pending.file, { sortOrder: index, altText: fields.name })
        } catch (photoError) {
          photoErrors.push(photoError.message)
        }
        URL.revokeObjectURL(pending.preview)
      }
      setPendingFiles([])

      const wantedStatus = info.visible ? 'active' : (productRow.status === 'draft' ? 'draft' : 'inactive')
      if (productRow.status !== wantedStatus) {
        productRow = (await updateAdminProduct(productRow.id, { status: wantedStatus })).data
      }
      setSaved(productRow)
      setMessage(info.visible ? 'Produit enregistré — visible dans la boutique.' : 'Produit enregistré — masqué de la boutique.')
      if (photoErrors.length) setError(`Produit enregistré, mais ${photoErrors.length} photo(s) non envoyée(s) : ${photoErrors.join(' ')} Ajoutez-les à nouveau.`)
    } catch (saveError) {
      setError(saveError.message || 'Impossible d’enregistrer le produit.')
    } finally {
      if (productRow?.id) await loadSaved(productRow.id).catch(() => {})
      setSaving(false)
      onSaved()
    }
  }

  if (loading) return <div className="admin-panel product-editor"><p className="notice">Chargement du produit…</p></div>

  return (
    <form className="admin-panel admin-form product-editor" onSubmit={save}>
      <div className="product-editor-head">
        <div>
          <span className="eyebrow eyebrow-dark">{saved ? 'Modifier le produit' : 'Nouveau produit'}</span>
          <h3>{info.name || 'Sans nom'}</h3>
        </div>
        <label className="switch-field">
          <input type="checkbox" checked={info.visible} onChange={(event) => setField('visible', event.target.checked)} />
          <span className="switch" aria-hidden="true" />
          {info.visible ? 'Visible dans la boutique' : 'Masqué de la boutique'}
        </label>
      </div>

      <section className="product-editor-section">
        <h4>1. Informations</h4>
        <div className="admin-form-grid">
          <label className="admin-form-wide">
            Nom du produit
            <input required placeholder="ex. Vozol Gear 20K" value={info.name} onChange={(event) => setField('name', event.target.value)} />
            <small className="field-help">
              Adresse : /products/
              <input
                className="inline-slug"
                aria-label="Adresse du produit"
                value={info.slug}
                onChange={(event) => setField('slug', event.target.value)}
              />
            </small>
          </label>
          <label>
            Catégorie
            <select required value={info.category_id} onChange={(event) => setField('category_id', event.target.value)}>
              <option value="">Choisir…</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            Marque
            <select required value={info.brand_id} onChange={(event) => setField('brand_id', event.target.value)}>
              <option value="">Choisir…</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="admin-form-wide">
            Description <span className="field-optional">(facultatif)</span>
            <textarea rows={3} placeholder="Ce que le client doit savoir sur le produit" value={info.description} onChange={(event) => setField('description', event.target.value)} />
          </label>
        </div>
      </section>

      <section className="product-editor-section">
        <h4>2. Photos</h4>
        <ProductPhotos
          productId={saved?.id}
          productName={info.name}
          images={images}
          onImagesChange={setImages}
          variants={rows}
          pendingFiles={pendingFiles}
          onPendingChange={setPendingFiles}
        />
      </section>

      <section className="product-editor-section">
        <h4>3. Prix et stock</h4>
        <p className="field-help">Une ligne par variante (saveur, taille…). S’il n’y a qu’un seul prix, gardez une seule ligne « Standard ».</p>
        <div className="variant-table" role="table" aria-label="Variantes">
          <div className="variant-line variant-line-head" role="row">
            <span>Variante</span><span>Prix (TND)</span><span>Stock</span><span>Par défaut</span><span>Visible</span><span />
          </div>
          {rows.map((row) => (
            <div className="variant-block" key={row.key}>
              <div className="variant-line" role="row">
                <input aria-label="Nom de la variante" placeholder="Standard, Menthe, 15K…" value={row.name} onChange={(event) => setRow(row.key, 'name', event.target.value)} />
                <input aria-label="Prix (TND)" type="number" step="0.001" min="0" inputMode="decimal" placeholder="0.000" value={row.price_tnd} onChange={(event) => setRow(row.key, 'price_tnd', event.target.value)} />
                <span className="variant-stock">
                  <input aria-label="Stock" type="number" step="1" min="0" inputMode="numeric" value={row.stock} onChange={(event) => setRow(row.key, 'stock', event.target.value)} />
                  {row.reserved > 0 && <small>{row.reserved} réservé(s)</small>}
                </span>
                <label className="variant-flag">
                  <input aria-label="Variante par défaut" type="radio" name="default-variant" checked={row.is_default} onChange={() => setRow(row.key, 'is_default', true)} />
                  <span>Par défaut</span>
                </label>
                <label className="variant-flag">
                  <input
                    aria-label="Variante visible"
                    type="checkbox"
                    checked={row.visible || row.is_default}
                    disabled={row.is_default}
                    title={row.is_default ? 'La variante par défaut est toujours visible.' : ''}
                    onChange={(event) => setRow(row.key, 'visible', event.target.checked)}
                  />
                  <span>Visible</span>
                </label>
                <span className="variant-actions">
                  <button type="button" onClick={() => setOpenDetails(openDetails === row.key ? null : row.key)} aria-expanded={openDetails === row.key}>
                    Plus
                  </button>
                  <button type="button" className="danger-text" onClick={() => removeRow(row)} aria-label={`Supprimer ${row.name || 'la variante'}`}>✕</button>
                </span>
              </div>
              {openDetails === row.key && (
                <div className="variant-details">
                  <label>
                    SKU <span className="field-optional">(généré si vide)</span>
                    <input value={row.sku} placeholder={slugify(`${info.slug}-${row.name}`).toUpperCase()} onChange={(event) => setRow(row.key, 'sku', event.target.value)} />
                  </label>
                  <label>
                    Modèle <span className="field-optional">(regroupe les variantes sur la fiche)</span>
                    <input value={row.model} placeholder="Standard" onChange={(event) => setRow(row.key, 'model', event.target.value)} />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="button button-secondary button-small" onClick={() => setRows((current) => [...current, newRow()])}>
          ＋ Ajouter une variante
        </button>
      </section>

      <div className="product-editor-actions">
        {error && <p className="form-message is-error" role="alert">{error}</p>}
        {message && !error && <p className="form-message is-success" role="status">{message}</p>}
        <button type="button" onClick={onClose} disabled={saving}>Fermer</button>
        <button className="button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

export default ProductEditor
