import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback.jsx'
import { resolveImageUrl } from '../services/imageService.js'
import { getProductImagePath } from '../utils/productImages.js'

function ProductCard({ product, index = 0 }) {
  const reduceMotion = useReducedMotion()
  const variant = product.variants?.[0]
  const imagePath = getProductImagePath(product)
  const brandName = product.brands?.name || product.brand?.name || product.brand_name || product.brand_id
  const categoryName = product.categories?.name || product.category?.name || product.category_name || product.category_id
  const availableStock = (product.variants || []).some((item) => item.in_stock)
  const motionProps = reduceMotion ? {} : {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.5, delay: Math.min(index * 0.05, 0.25), ease: [0.22, 1, 0.36, 1] },
    whileHover: { y: -6 },
  }

  if (!product.slug) {
    return (
      <motion.article className="product-card product-card-static" {...motionProps}>
        <div className="product-image-wrap">
          <div className="product-image product-image-fallback" aria-label={`Image de ${product.name}`} role="img">◈</div>
        </div>
        <div className="product-body">
          <h3>{product.name}</h3>
          <span className="product-availability is-out">Indisponible</span>
        </div>
      </motion.article>
    )
  }

  return (
    <motion.article className="product-card" {...motionProps}>
      <Link className="product-card-link" to={`/products/${encodeURIComponent(product.slug)}`}>
        <div className="product-image-wrap">
          <ImageWithFallback
            className="product-image"
            src={resolveImageUrl(imagePath)}
            alt={product.name}
            loading="lazy"
            fallbackClassName="product-image product-image-fallback"
            fallbackLabel={`Image de ${product.name}`}
          />
          <div className="product-badges">
            <span className={`product-badge${availableStock ? ' is-in' : ' is-out'}`}>
              <span className="status-dot" />
              {availableStock ? 'En stock' : 'Rupture'}
            </span>
          </div>
          <span className="product-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </span>
        </div>
        <div className="product-body">
          <span className="product-brand">{brandName || 'Marque indisponible'}</span>
          <h3>{product.name}</h3>
          <div className="product-meta">
            <span className="product-category">{categoryName || 'Catégorie indisponible'}</span>
            <span className="price">
              {variant?.price_tnd ?? '—'}
              <small>TND</small>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

export default ProductCard
