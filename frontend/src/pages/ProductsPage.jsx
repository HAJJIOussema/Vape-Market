import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ProductGrid from '../components/ProductGrid.jsx'
import { getProducts } from '../services/productService.js'

function ProductsPage({ searchQuery = '', categoryId = '' }) {
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
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery) return products

    return products.filter((product) => {
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
  }, [products, searchQuery])

  return (
    <section>
      <div className="section-heading">
        <h1>Produits</h1>
        {status === 'ready' && <span>{visibleProducts.length} produit(s)</span>}
      </div>
      {status === 'loading' && <LoadingSpinner />}
      {status === 'error' && <p role="alert">{error}</p>}
      {status === 'ready' && visibleProducts.length === 0 && <p>Aucun produit trouvé</p>}
      {status === 'ready' && visibleProducts.length > 0 && <ProductGrid products={visibleProducts} />}
    </section>
  )
}

export default ProductsPage
