import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getProductBySlug } from '../services/productService.js'
import { useCart } from '../context/useCart.js'

function ProductDetailsPage() {
  const { slug } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getProductBySlug(slug)
      .then((response) => {
        if (!active) return
        setProduct(response.data || response)
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
      <section>
        <h1>Produit introuvable</h1>
        <p role="alert">{error}</p>
        <Link className="button" to="/products">Retour aux produits</Link>
      </section>
    )
  }

  const variant = product.variants?.[0]
  const imagePath = product.image_paths?.[0]
  const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL
  const brandName = product.brands?.name || product.brand?.name || product.brand_name || product.brand_id
  const categoryName = product.categories?.name || product.category?.name || product.category_name || product.category_id
  const availableStock = (product.variants || []).some((item) => item.in_stock)

  return (
    <article className="product-details">
      {imagePath && imageBaseUrl ? (
        <img
          className="product-details-image"
          src={`${imageBaseUrl.replace(/\/$/, '')}/${imagePath}`}
          alt={product.name}
        />
      ) : (
        <div className="product-details-image product-image-placeholder" role="img" aria-label={`Image de ${product.name}`}>
          ◈
        </div>
      )}
      <div className="product-details-body">
        <p>{brandName || 'Marque indisponible'}</p>
        <h1>{product.name}</h1>
        <p>{categoryName || 'Catégorie indisponible'}</p>
        <p className="product-description">{product.description || 'Aucune description disponible.'}</p>
        <p className="price">{variant?.price_tnd ?? '—'} TND</p>
        <p>{availableStock ? 'En stock' : 'Rupture de stock'}</p>
        <button className="button" type="button" disabled={!availableStock} onClick={() => addItem(product, variant)}>
          Ajouter au panier
        </button>
        <h2>Variantes</h2>
        <ul>
          {(product.variants || []).map((item) => (
            <li key={item.id}>
              {item.name} — {item.price_tnd} TND — {item.in_stock ? 'En stock' : 'Rupture de stock'}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default ProductDetailsPage
