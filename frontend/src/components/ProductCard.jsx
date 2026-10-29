function ProductCard({ product }) {
  return <article className="product-card"><div className="product-image" aria-hidden="true">◈</div>
    <div className="product-body"><h3>{product.name}</h3><div className="product-meta"><span>{product.category}</span><span className="price">{product.price} DT</span></div></div>
  </article>
}

export default ProductCard