import { useEffect, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import { getProducts } from '../services/productService.js'

function HomePage({ onNavigate }) {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

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

  return <><section className="hero"><h1>Découvrez notre sélection.</h1><p>Une boutique claire et pratique pour trouver vos produits préférés.</p><button className="button" onClick={() => onNavigate('products')}>Voir les produits</button></section>
    <section><div className="section-heading"><h2>Produits populaires</h2><button className="header-action" onClick={() => onNavigate('products')}>Tout voir</button></div>
      {status === 'loading' && <LoadingSpinner />}
      {status === 'error' && <p role="alert">{error}</p>}
      {status === 'ready' && <ProductGrid products={featuredProducts} />}
    </section>
  </>
}

export default HomePage
