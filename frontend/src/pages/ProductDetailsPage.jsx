import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getProductBySlug } from '../services/productService.js'
import { useCart } from '../context/useCart.js'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import { resolveImageUrl } from '../services/imageService.js'

function ProductDetailsPage() {
  const { slug } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let active = true

    getProductBySlug(slug)
      .then((response) => {
        if (!active) return
        const nextProduct = response.data || response
        setProduct(nextProduct)
        setSelectedVariantId(nextProduct?.variants?.[0]?.id ?? null)
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
  const selectedVariant = variants.find((item) => item.id === selectedVariantId) || variants[0] || null
  const variant = selectedVariant
  const imagePath = product.image_paths?.[0]
  const brandName = product.brands?.name || product.brand?.name || product.brand_name || product.brand_id
  const categoryName = product.categories?.name || product.category?.name || product.category_name || product.category_id
  const availableStock = Boolean(selectedVariant?.in_stock)

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
        <div className="product-details-media">
          <ImageWithFallback
            className="product-details-image"
            src={resolveImageUrl(imagePath)}
            alt={product.name}
            fallbackClassName="product-details-image product-image-placeholder"
            fallbackLabel={`Image de ${product.name}`}
          />
          <span className={`product-stock-badge${availableStock ? ' is-in' : ' is-out'}`}>
            <span className="status-dot" />
            {availableStock ? 'Disponible' : 'Rupture de stock'}
          </span>
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
              <h2>Variantes</h2>
              <span>{(product.variants || []).length}</span>
            </div>
            {(product.variants || []).length === 0 ? (
              <p className="notice">Aucune variante disponible.</p>
            ) : (
              <ul className="variant-list">
                {variants.map((item) => {
                  const isSelected = item.id === selectedVariant?.id
                  return (
                    <li key={item.id}>
                      <motion.button
                        type="button"
                        className={`variant-option${isSelected ? ' is-selected' : ''}${item.in_stock ? '' : ' is-unavailable'}`}
                        onClick={() => setSelectedVariantId(item.id)}
                        whileHover={reduceMotion ? undefined : { y: -2 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                        disabled={!item.in_stock}
                      >
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
            )}
          </div>
        </div>
      </motion.div>
    </article>
  )
}

export default ProductDetailsPage
