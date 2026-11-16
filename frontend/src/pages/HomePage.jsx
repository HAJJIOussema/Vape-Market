import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import { getProducts } from '../services/productService.js'

const assurances = [
  {
    title: 'Livraison partout en Tunisie',
    description: 'Expédition rapide et suivie vers toutes les régions.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="18" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    title: 'Produits authentiques',
    description: 'Une sélection vérifiée pour une expérience fiable.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
  },
  {
    title: 'Support client',
    description: 'Une équipe disponible pour vous accompagner.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 16 0M7 12v4a2 2 0 0 0 2 2h1M17 12v4a2 2 0 0 0-2 2h-1" />
      </svg>
    ),
  },
  {
    title: 'Paiement sécurisé',
    description: 'Commande simple et paiement à la livraison.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="13" rx="2.5" />
        <path d="M3 10h18M7 15h4" />
      </svg>
    ),
  },
]

function HomePage({ onNavigate }) {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getProducts('page_size=100')
      .then((productsResponse) => {
        if (!active) return
        setProducts(productsResponse.data || productsResponse || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Impossible de charger la sélection.')
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  const bestSellers = useMemo(() => products.slice(0, 8), [products])
  // Hero uses the project cover image.

  const brands = useMemo(() => {
    const brandCatalog = [
      { name: 'Vozol', slug: 'vozol', logo: '/brands/vozol.png' },
      { name: 'Nexpod', slug: 'nexpod', logo: '/brands/nexpod.png' },
      { name: 'Refillo', slug: 'refillo', logo: '/brands/refillo.png' },
      { name: 'Deep Cloud', slug: 'deep-cloud', logo: '/brands/deep-cloud.png' },
      { name: 'Mazaya', slug: 'mazaya', logo: '/brands/mazaya.png' },
      { name: 'Al Fakher', slug: 'al-fakher', logo: '/brands/al-fakher.png' },
    ]
    return brandCatalog.map((brand) => ({
      ...brand,
      count: products.filter((product) => {
        const productBrand = product.brands?.name || product.brand?.name || ''
        return productBrand.toLowerCase() === brand.name.toLowerCase()
      }).length,
    }))
  }, [products])

  return (
    <>
      <motion.section
        className="hero hero-commerce"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hero-content">
          <span className="hero-badge">VAPE MARKET • LE MEILLEUR CHOIX DE PUFFS</span>
          <h1>Découvrez notre collection de Puffs</h1>
          <p>
            Des marques premium,
            des saveurs incroyables
            et une qualité garantie.
          </p>
          <div className="hero-actions">
            <motion.button
              className="button button-accent"
              type="button"
              onClick={() => onNavigate('products')}
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              Acheter maintenant
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </motion.button>
            <button className="button button-ghost-light" type="button" onClick={() => onNavigate('categories')}>
              Découvrir les catégories
            </button>
          </div>
        </div>

        <div className="hero-glow" aria-hidden="true" />
      </motion.section>

      {brands.length > 0 && (
        <section id="marques" className="section-block brand-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow-dark">Marques</span>
              <h2>Nos marques</h2>
            </div>
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
                <img
                  className="brand-showcase-image"
                  src={brand.logo}
                  alt={brand.name}
                />
                <strong>{brand.name}</strong>
                <span>{brand.count} produit{brand.count > 1 ? 's' : ''}</span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <section className="assurance-section">
        <div className="assurance-grid">
          {assurances.map((item, index) => (
            <motion.article
              className="assurance-card"
              key={item.title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="assurance-icon">{item.icon}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="produits" className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-dark">Meilleures ventes</span>
            <h2>Les plus populaires</h2>
          </div>
          <button className="text-link" type="button" onClick={() => onNavigate('products')}>
            Tout voir
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        {status === 'loading' && <LoadingSpinner />}
        {status === 'error' && <p className="notice notice-error" role="alert">{error}</p>}
        {status === 'ready' && bestSellers.length === 0 && (
          <p className="notice">La sélection arrive bientôt.</p>
        )}
        {status === 'ready' && bestSellers.length > 0 && <ProductGrid products={bestSellers} />}
      </section>



      <section id="apropos" className="section-block about-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-dark">À propos</span>
            <h2>VAPE MARKET</h2>
          </div>
        </div>
        <div className="about-grid">
          <p>
            VAPE MARKET propose une sélection de puffs et produits vape premium,
            avec une expérience d’achat simple, rapide et sécurisée.
          </p>
          <p>
            Notre objectif : offrir des produits authentiques, un support client
            réactif et une livraison partout en Tunisie.
          </p>
        </div>
      </section>

      <section id="contact" className="section-block contact-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-dark">Contact</span>
            <h2>Nous contacter</h2>
          </div>
        </div>
        <div className="contact-grid">
          <a className="contact-card" href="mailto:vapemarket.tn@gmail.com">
            <strong>Email</strong>
            <span>vapemarket.tn@gmail.com</span>
          </a>
          <a className="contact-card" href="tel:+21699991944">
            <strong>Téléphone</strong>
            <span>+216 99 991 944</span>
          </a>
          <div className="contact-card">
            <strong>Horaires</strong>
            <span>Lun - Sam : 9h - 18h</span>
          </div>
        </div>
      </section>
    </>
  )
}

export default HomePage
