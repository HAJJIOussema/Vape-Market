import { Link } from 'react-router-dom'
import ImageWithFallback from './ImageWithFallback.jsx'
import { resolveImageUrl } from '../services/imageService.js'

function ProductCard({ product }) {
  const variant = product.variants?.[0]
  const imagePath = product.image_paths?.[0]
  const brandName = product.brands?.name || product.brand?.name || product.brand_name || product.brand_id
  const categoryName = product.categories?.name || product.category?.name || product.category_name || product.category_id
  const availableStock = (product.variants || []).some((item) => item.in_stock)

  if (!product.slug) return (
    <article className="product-card">
      <div className="product-image" aria-label={`Image de ${product.name}`} role="img">◈</div>
      <div className="product-body"><h3>{product.name}</h3></div>
    </article>
  )

  return (
    <Link className="product-card" to={`/products/${encodeURIComponent(product.slug)}`}>
      <ImageWithFallback
        className="product-image"
        src={resolveImageUrl(imagePath)}
        alt={product.name}
        fallbackClassName="product-image"
        fallbackLabel={`Image de ${product.name}`}
      />
      <div className="product-body">
        <h3>{product.name}</h3>
        <p>{brandName || 'Marque indisponible'}</p>
        <div className="product-meta">
          <span>{categoryName || 'Catégorie indisponible'}</span>
          <span className="price">{variant?.price_tnd ?? '—'} TND</span>
        </div>
        <small>{availableStock ? 'En stock' : 'Rupture de stock'}</small>
      </div>
    </Link>
  )
}

export default ProductCard