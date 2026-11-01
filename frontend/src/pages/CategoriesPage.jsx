import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getCategories } from '../services/categoryService.js'
import { getProducts } from '../services/productService.js'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import { resolveImageUrl } from '../services/imageService.js'

function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let active = true

    Promise.all([getCategories(), getProducts('page_size=100')])
      .then(([categoriesResponse, productsResponse]) => {
        if (!active) return
        setCategories(categoriesResponse.data || categoriesResponse)
        setProducts(productsResponse.data || productsResponse)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Impossible de charger les catégories.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [])

  const productCounts = useMemo(() => products.reduce((counts, product) => {
    counts[product.category_id] = (counts[product.category_id] || 0) + 1
    return counts
  }, {}), [products])

  const categoryImages = useMemo(() => products.reduce((images, product) => {
    if (!images[product.category_id] && product.image_paths?.[0]) {
      images[product.category_id] = product.image_paths[0]
    }
    return images
  }, {}), [products])

  if (status === 'loading') return <LoadingSpinner />

  if (status === 'error') {
    return <p className="notice notice-error" role="alert">{error}</p>
  }

  return (
    <section className="categories-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Explorer</span>
          <h1>Catégories</h1>
          <p>Choisissez une famille de produits et trouvez rapidement ce que vous cherchez.</p>
        </div>
        <span className="count-pill">{categories.length} catégorie{categories.length > 1 ? 's' : ''}</span>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">◈</span>
          <h2>Aucune catégorie trouvée</h2>
          <p>Les catégories seront disponibles prochainement.</p>
        </div>
      ) : (
        <div className="category-grid">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25), ease: [0.22, 1, 0.36, 1] }}
            >
              <Link className="category-card" to={`/products?category_id=${encodeURIComponent(category.id)}`}>
                <div className="category-card-media">
                  <ImageWithFallback
                    className="category-card-image"
                    src={resolveImageUrl(category.image_path || categoryImages[category.id])}
                    alt={category.name}
                    fallbackClassName="category-image-placeholder"
                    fallbackLabel={`Image de la catégorie ${category.name}`}
                  />
                  <span className="category-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </span>
                </div>
                <div className="category-card-body">
                  <div>
                    <h2>{category.name}</h2>
                    <p>{productCounts[category.id] || 0} produit{productCounts[category.id] > 1 ? 's' : ''}</p>
                  </div>
                  <span className="category-discover">Découvrir</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}

export default CategoriesPage
