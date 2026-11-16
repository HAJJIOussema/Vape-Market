import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import { getProducts } from '../services/productService.js'

import { getCatalogFamily } from '../utils/catalogFamilies.js'

function ProductsPage({ searchQuery = '', categoryId = '', brandSlug = '', familySlug = '' }) {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const params = new URLSearchParams({ page_size: '100' })
    if (categoryId) params.set('category_id', categoryId)

    getProducts(params.toString())
      .then((response) => {
        if (!active) return
        setProducts(Array.isArray(response) ? response : response.data || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Impossible de charger les produits.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [categoryId])

  const visibleProducts = useMemo(() => {
    let result = products

    const family = familySlug ? getCatalogFamily(familySlug) : null
    if (family) {
      result = result.filter((product) => family.products.includes(product.slug))
    }

    if (brandSlug) {
      const normalizedBrand = brandSlug.trim().toLocaleLowerCase()
      result = result.filter((product) => {
        const brand = product.brands?.slug || product.brand?.slug || product.brand_slug
        const brandName = product.brands?.name || product.brand?.name || product.brand_name || ''
        return String(brand || '').toLocaleLowerCase() === normalizedBrand
          || brandName.toLocaleLowerCase().includes(normalizedBrand)
      })
    }

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery) return result

    return result.filter((product) => {
      const searchableValues = [
        product.name,
        product.brands?.name,
        product.brand?.name,
        product.brand_name,
        product.categories?.name,
        product.category?.name,
        product.category_name,
      ]
      return searchableValues.some((value) => (
        typeof value === 'string' && value.toLocaleLowerCase().includes(normalizedQuery)
      ))
    })
  }, [products, searchQuery, brandSlug, familySlug])

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow eyebrow-dark">Catalogue</span>
          <h1>Produits</h1>
          <p>Parcourez notre sélection et trouvez le produit qui vous correspond.</p>
        </div>
        {status === 'ready' && (
          <span className="count-pill">
            {visibleProducts.length} produit{visibleProducts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {searchQuery && (
        <div className="filter-note">
          <span>Résultats pour « {searchQuery} »</span>
          <span>{visibleProducts.length} correspondance{visibleProducts.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {status === 'loading' && <LoadingSpinner />}
      {status === 'error' && <p className="notice notice-error" role="alert">{error}</p>}
      {status === 'ready' && visibleProducts.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">◈</span>
          <h2>Aucun produit trouvé</h2>
          <p>Essayez une autre recherche ou explorez une autre catégorie.</p>
        </div>
      )}
      {status === 'ready' && visibleProducts.length > 0 && <ProductGrid products={visibleProducts} />}
    </section>
  )
}

export default ProductsPage
