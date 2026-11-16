import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import { getProducts } from '../services/productService.js'
import { catalogFamilies } from '../utils/catalogFamilies.js'

function CategoriesPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getProducts('page_size=100')
      .then((response) => {
        if (!active) return
        setProducts(response.data || response || [])
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

  const families = useMemo(() => catalogFamilies.map((family) => ({
    ...family,
    count: products.filter((product) => family.products.includes(product.slug)).length,
  })), [products])

  if (status === 'loading') return <LoadingSpinner />
  if (status === 'error') return <p className="notice notice-error" role="alert">{error}</p>

  return (
    <section className="brands-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Catalogue</span>
          <h1>Catégories</h1>
          <p>Choisissez une catégorie pour découvrir ses produits.</p>
        </div>
        <span className="count-pill">{families.length}</span>
      </div>

      <div className="brand-showcase">
        {families.map((family, index) => (
          <motion.button
            type="button"
            className="brand-showcase-card"
            key={family.slug}
            onClick={() => navigate(`/products?family=${encodeURIComponent(family.slug)}`)}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <ImageWithFallback
              className="brand-showcase-image"
              src={family.logo || ''}
              alt={family.name}
              fallbackClassName="brand-showcase-image brand-showcase-fallback"
              fallbackLabel={family.name}
            />
            <strong>{family.name}</strong>
            <span>{family.count} produit{family.count > 1 ? 's' : ''}</span>
            <span className="category-discover">Découvrir</span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}

export default CategoriesPage