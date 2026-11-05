import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ImageWithFallback from '../components/ImageWithFallback.jsx'
import { getProducts } from '../services/productService.js'

const brandsCatalog = [
  { name: 'Vozol', slug: 'vozol', logo: '/brands/vozol.png' },
  { name: 'Nexpod', slug: 'nexpod', logo: '/brands/nexpod.png' },
  { name: 'Refillo', slug: 'refillo', logo: '/brands/refillo.png' },
  { name: 'Mazaya', slug: 'mazaya', logo: '/brands/mazaya.png' },
  { name: 'Al Fakher', slug: 'al-fakher', logo: '/brands/al-fakher.png' },
  { name: 'Wotofo', slug: 'wotofo', logo: '/brands/wotofo.png' },
]

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
        setError(requestError.message || 'Impossible de charger les marques.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [])

  const brands = useMemo(() => brandsCatalog.map((brand) => ({
    ...brand,
    count: products.filter((product) => {
      const productBrand = product.brands?.slug || product.brand?.slug || product.brand_slug || ''
      const productName = product.brands?.name || product.brand?.name || product.brand_name || ''
      return String(productBrand).toLowerCase() === brand.slug
        || productName.toLowerCase() === brand.name.toLowerCase()
    }).length,
  })), [products])

  if (status === 'loading') return <LoadingSpinner />
  if (status === 'error') return <p className="notice notice-error" role="alert">{error}</p>

  return (
    <section className="brands-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Marques</span>
          <h1>Nos marques</h1>
          <p>Choisissez une marque pour découvrir ses produits.</p>
        </div>
        <span className="count-pill">{brands.length}</span>
      </div>

      <div className="brand-showcase">
        {brands.map((brand, index) => (
          <motion.button
            type="button"
            className="brand-showcase-card"
            key={brand.slug}
            onClick={() => navigate(`/products?brand=${encodeURIComponent(brand.slug)}`)}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <ImageWithFallback
              className="brand-showcase-image"
              src={brand.logo}
              alt={brand.name}
              fallbackClassName="brand-showcase-image brand-showcase-fallback"
              fallbackLabel={`Logo ${brand.name}`}
            />
            <strong>{brand.name}</strong>
            <span>{brand.count} produit{brand.count > 1 ? 's' : ''}</span>
            <span className="category-discover">Découvrir</span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}

export default CategoriesPage