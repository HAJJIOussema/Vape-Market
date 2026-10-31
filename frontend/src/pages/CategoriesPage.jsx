import { useEffect, useMemo, useState } from 'react'
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
    return <p role="alert">{error}</p>
  }

  return (
    <section>
      <div className="section-heading">
        <h1>Catégories</h1>
        <span>{categories.length} catégorie(s)</span>
      </div>
      {categories.length === 0 ? (
        <p>Aucune catégorie trouvée</p>
      ) : (
        <div className="category-grid">
          {categories.map((category) => (
            <Link className="category-card" key={category.id} to={`/products?category_id=${encodeURIComponent(category.id)}`}>
              <ImageWithFallback
                className="category-card-image"
                src={resolveImageUrl(category.image_path || categoryImages[category.id])}
                alt={category.name}
                fallbackClassName="category-image-placeholder"
                fallbackLabel={`Image de la catégorie ${category.name}`}
              />
              <div>
                <h2>{category.name}</h2>
                <p>{productCounts[category.id] || 0} produit(s)</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default CategoriesPage
