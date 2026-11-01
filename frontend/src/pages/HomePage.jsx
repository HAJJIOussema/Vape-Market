import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import { getProducts } from '../services/productService.js'

const features = [
  {
    title: 'Sélection vérifiée',
    description: 'Des produits choisis avec soin, disponibles et prêts à être expédiés.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
  },
  {
    title: 'Livraison rapide',
    description: 'Une préparation soignée et un suivi simple, de la commande à la réception.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="18" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    title: 'Paiement serein',
    description: 'Un parcours d’achat fluide et sécurisé, sur mobile comme sur ordinateur.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="13" rx="2.5" />
        <path d="M3 10h18M7 15h4" />
      </svg>
    ),
  },
]

function HomePage({ onNavigate }) {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let active = true
    getProducts('page_size=3')
      .then((response) => {
        if (!active) return
        setFeaturedProducts(response.data || response)
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

  return (
    <>
      <motion.section
        className="hero"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hero-content">
          <span className="eyebrow">Nouvelle sélection · VAPE MARKET</span>
          <h1>Trouvez votre prochain coup de cœur.</h1>
          <p>
            Une boutique pensée pour aller à l’essentiel : de belles références,
            des informations claires et une commande en quelques clics.
          </p>
          <div className="hero-actions">
            <motion.button
              className="button button-accent"
              type="button"
              onClick={() => onNavigate('products')}
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              Explorer la boutique
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </motion.button>
            <button className="button button-ghost-light" type="button" onClick={() => onNavigate('categories')}>
              Parcourir les catégories
            </button>
          </div>
          <div className="hero-note">
            <span className="hero-note-dot" aria-hidden="true" />
            Livraison suivie · Commande sécurisée · Support à l’écoute
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <motion.div
            className="hero-card hero-card-main"
            initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="hero-card-top">
              <span className="hero-card-label">Sélection du moment</span>
              <span className="hero-card-pill">Nouveau</span>
            </div>
            <div className="hero-product-shape">
              <div className="hero-product-cap" />
              <div className="hero-product-body">
                <span>VAPE</span>
                <strong>MARKET</strong>
              </div>
            </div>
            <div className="hero-card-bottom">
              <div>
                <span>À découvrir</span>
                <strong>La collection</strong>
              </div>
              <span className="hero-card-arrow">↗</span>
            </div>
          </motion.div>
          <motion.div
            className="hero-card hero-card-float"
            initial={reduceMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="hero-float-icon">
              <svg viewBox="0 0 24 24">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </span>
            <div>
              <strong>Qualité vérifiée</strong>
              <span>Une sélection fiable</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <section className="trust-strip" aria-label="Les avantages VAPE MARKET">
        <span>Une expérience pensée pour vous</span>
        <span className="trust-separator" aria-hidden="true" />
        <span>Produits disponibles en temps réel</span>
        <span className="trust-separator" aria-hidden="true" />
        <span>Suivi de commande simplifié</span>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-dark">La sélection</span>
            <h2>Produits populaires</h2>
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
        {status === 'ready' && featuredProducts.length === 0 && (
          <p className="notice">La sélection arrive bientôt.</p>
        )}
        {status === 'ready' && featuredProducts.length > 0 && <ProductGrid products={featuredProducts} />}
      </section>

      <section className="feature-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow-dark">Pourquoi nous choisir</span>
            <h2>Simple, rapide, soigné.</h2>
          </div>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <motion.article
              className="feature-card"
              key={feature.title}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </>
  )
}

export default HomePage
