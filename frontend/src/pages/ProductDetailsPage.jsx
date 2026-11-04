import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getProductBySlug } from '../services/productService.js'
import { useCart } from '../context/useCart.js'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import { resolveImageUrl } from '../services/imageService.js'
import { getFlavorArtworkPath, getFlavorColor, getFlavorTheme } from '../utils/flavor.js'

function ProductDetailsPage() {
  const { slug } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let active = true

    getProductBySlug(slug)
      .then((response) => {
        if (!active) return
        const nextProduct = response.data || response
        setProduct(nextProduct)
        const firstVariant = nextProduct?.variants?.[0] || null
        setSelectedModel(firstVariant?.attributes?.model || (nextProduct?.variants?.length ? 'Standard' : null))
        setSelectedVariantId(firstVariant?.id ?? null)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Impossible de charger ce produit.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [slug])

  if (status === 'loading') return <LoadingSpinner />

  if (status === 'error') {
    return (
      <section className="empty-state">
        <span className="empty-state-icon" aria-hidden="true">◈</span>
        <h1>Produit introuvable</h1>
        <p role="alert">{error}</p>
        <Link className="button" to="/products">Retour aux produits</Link>
      </section>
    )
  }

  const variants = product.variants || []
  const productImages = product.product_images || product.images || []
  const models = [...new Set(variants.map((item) => item.attributes?.model || 'Standard'))]
  const activeModel = selectedModel && models.includes(selectedModel) ? selectedModel : models[0] || null
  const modelVariants = activeModel
    ? variants.filter((item) => (item.attributes?.model || 'Standard') === activeModel)
    : variants
  const selectedVariant = modelVariants.find((item) => item.id === selectedVariantId) || modelVariants[0] || null
  const variant = selectedVariant
  const productImage = productImages.find((image) => !image.variant_id)
  const productImagePath = productImage?.storage_path || productImage?.secure_url
  const imagePath = getVariantImagePath(selectedVariant) || productImagePath || product.image_paths?.[0]
  const flavorColor = getFlavorColor(selectedVariant?.name)
  const flavorTheme = getFlavorTheme(selectedVariant?.name)
  const brandName = product.brands?.name || product.brand?.name || product.brand_name || product.brand_id
  const categoryName = product.categories?.name || product.category?.name || product.category_name || product.category_id
  const availableStock = Boolean(selectedVariant?.in_stock)

  function getVariantImagePath(item) {
    const variantImage = productImages.find((image) => image.variant_id === item?.id)
    return variantImage?.storage_path || variantImage?.secure_url || item?.image_path || getFlavorArtworkPath(product, item)
  }

  function resolveProductImage(path) {
    return path?.startsWith('/') ? path : resolveImageUrl(path)
  }

  function selectModel(model) {
    setSelectedModel(model)
    const firstVariant = variants.find((item) => (item.attributes?.model || 'Standard') === model)
    setSelectedVariantId(firstVariant?.id ?? null)
  }

  return (
    <article className="product-details-page">
      <nav className="product-breadcrumb" aria-label="Fil d’Ariane">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true">/</span>
        <Link to="/products">Produits</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>

      <motion.div
        className="product-details"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="product-details-media"
          style={{
            '--flavor-accent': flavorColor,
            '--flavor-soft': flavorTheme.soft,
            '--flavor-glow': flavorTheme.glow,
          }}
        >
          <ImageWithFallback
            key={`${selectedVariant?.id || 'default'}-${imagePath || 'fallback'}`}
            className="product-details-image"
            src={resolveProductImage(imagePath)}
            alt={`${product.name}${selectedVariant?.name ? ` — ${selectedVariant.name}` : ''}`}
            fallbackClassName="product-details-image product-image-placeholder"
            fallbackLabel={`Image de ${product.name}`}
          />
          <span className={`product-stock-badge${availableStock ? ' is-in' : ' is-out'}`}>
            <span className="status-dot" />
            {availableStock ? 'Disponible' : 'Rupture de stock'}
          </span>
          {selectedVariant?.name && (
            <span className="product-image-flavor">{selectedVariant.name}</span>
          )}
          {selectedVariant?.name && (
            <span className="product-image-label">{selectedVariant.name}</span>
          )}
        </div>

        <div className="product-details-body">
          <span className="product-brand">{brandName || 'Marque indisponible'}</span>
          <h1>{product.name}</h1>
          <span className="product-details-category">{categoryName || 'Catégorie indisponible'}</span>
          <p className="product-description">{product.description || 'Aucune description disponible.'}</p>

          <div className="product-price-block">
            <span className="price">
              {variant?.price_tnd ?? '—'}
              <small>TND</small>
            </span>
            <span className="product-price-note">Prix TTC · TVA incluse</span>
          </div>
          {selectedVariant?.sku && <p className="product-sku">SKU : {selectedVariant.sku}</p>}

          <div className="product-purchase">
            <button className="button" type="button" disabled={!availableStock} onClick={() => addItem(product, variant)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
                <path d="M9 8.5V6.75a3 3 0 0 1 6 0V8.5" />
              </svg>
              Ajouter au panier
            </button>
            <Link className="button button-secondary" to="/cart">Voir le panier</Link>
          </div>

          <div className="product-assurances">
            <span>Commande sécurisée</span>
            <span>Suivi disponible</span>
            <span>Support réactif</span>
          </div>

          <div className="product-variants">
            <div className="product-variants-heading">
              <div>
                <h2>Saveurs</h2>
                <p className="product-variants-hint">Sélectionnez une saveur pour voir son visuel.</p>
              </div>
              <span>{modelVariants.length}</span>
            </div>
            {(product.variants || []).length === 0 ? (
              <p className="notice">Aucune variante disponible.</p>
            ) : (
              <>
                {models.length > 1 && (
                  <div className="model-selector">
                    <span className="model-selector-label">Modèle</span>
                    <div className="model-list">
                      {models.map((model) => (
                        <motion.button
                          key={model}
                          type="button"
                          className={`model-option${model === activeModel ? ' is-selected' : ''}`}
                          onClick={() => selectModel(model)}
                          whileHover={reduceMotion ? undefined : { y: -2 }}
                          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                        >
                          {model}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                <ul className="variant-list">
                {modelVariants.map((item) => {
                  const isSelected = item.id === selectedVariant?.id
                  const itemArtwork = getVariantImagePath(item)
                  const itemTheme = getFlavorTheme(item.name)
                  return (
                    <li key={item.id}>
                      <motion.button
                        type="button"
                        className={`variant-option${isSelected ? ' is-selected' : ''}${item.in_stock ? '' : ' is-unavailable'}`}
                        style={{ '--flavor-accent': itemTheme.accent, '--flavor-glow': itemTheme.glow }}
                        onClick={() => setSelectedVariantId(item.id)}
                        whileHover={reduceMotion ? undefined : { y: -2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                        disabled={!item.in_stock}
                        aria-pressed={isSelected}
                      >
                        <span className="variant-thumb" aria-hidden="true">
                          {itemArtwork ? (
                            <img
                              key={itemArtwork}
                              src={resolveProductImage(itemArtwork)}
                              alt=""
                              loading="lazy"
                              width="54"
                              height="54"
                            />
                          ) : (
                            <span className="variant-thumb-fallback" />
                          )}
                        </span>
                        <span className="variant-option-main">
                          <strong>{item.name}</strong>
                          <span>{item.in_stock ? 'En stock' : 'Rupture de stock'}</span>
                        </span>
                        <span className="variant-option-side">
                          <span className="variant-price">{item.price_tnd} TND</span>
                          <span className="variant-check" aria-hidden="true">
                            {isSelected && (
                              <svg viewBox="0 0 24 24">
                                <path d="m5 12 4 4L19 6" />
                              </svg>
                            )}
                          </span>
                        </span>
                      </motion.button>
                    </li>
                  )
                })}
              </ul>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </article>
  )
}

export default ProductDetailsPage
